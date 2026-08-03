import { once } from "node:events";
import process from "node:process";
import { Pool } from "pg";

import { createApp } from "./app.mjs";
import { createJwtKeys } from "./platform/security/index.mjs";
import { createTracing } from "./platform/tracing.mjs";
import { createOperatorsService } from "./services/operators/index.mjs";
import { createPasskeysService } from "./services/passkeys/index.mjs";
import { createSessionsService } from "./services/sessions/index.mjs";

await using tracing = createTracing();

tracing.start();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => console.error(err));

const { jwks, signingKey } = await createJwtKeys();

const operators = createOperatorsService({ pool });
const passkeys = createPasskeysService({
  origin: /** @type {string} */ (process.env.ORIGIN),
  pool,
});
const sessions = createSessionsService({
  pool,
  signingKey,
});

await using app = await createApp({
  fastifyOtel: tracing.fastifyOtel,
  jwks,
  operators,
  passkeys,
  pool,
  sessions,
});

app.addHook("onClose", () => pool.end());

await app.listen({ host: "0.0.0.0", port: 3000 });

const [signal] = await Promise.race(
  ["SIGINT", "SIGTERM", "SIGUSR2"].map((code) => once(process, code)),
);

app.log.info({ signal }, "closing server");
