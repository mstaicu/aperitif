import { once } from "node:events";
import process from "node:process";

import { createApp } from "./app.mjs";
import { createPostgres } from "./platform/postgres.mjs";
import { createJwtKeys } from "./platform/security/index.mjs";
import { createTracing } from "./platform/tracing.mjs";
import { createOperatorsService } from "./services/operators/index.mjs";
import { createPasskeysService } from "./services/passkeys/index.mjs";
import { createSessionsService } from "./services/sessions/index.mjs";

const tracing = createTracing();

tracing.start();

const postgres = createPostgres();
const { jwks, signingKey } = await createJwtKeys();

if (!process.env.ORIGIN) {
  throw new Error("ORIGIN is required");
}

const app = await createApp({
  db: postgres.db,
  fastifyOtel: tracing.fastifyOtel,
  jwks,
  services: {
    operators: createOperatorsService({ db: postgres.db }),
    passkeys: createPasskeysService({
      db: postgres.db,
      origin: process.env.ORIGIN,
    }),
    sessions: createSessionsService({
      db: postgres.db,
      signingKey,
    }),
  },
});

app.addHook("onClose", () => tracing.close());
app.addHook("onClose", () => postgres.close());

await app.listen({ host: "0.0.0.0", port: 3000 });

const [signal] = await Promise.race(
  ["SIGINT", "SIGTERM", "SIGUSR2"].map((code) => once(process, code)),
);

app.log.info({ signal }, "closing server");

await app.close();

app.log.info("shutdown complete");
