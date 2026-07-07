import { once } from "node:events";
import process from "node:process";

import { createApp } from "./app.mjs";
import { createPostgres } from "./platform/postgres.mjs";
import { createIdentityJwks } from "./platform/security/index.mjs";
import { createTracing } from "./platform/tracing.mjs";
import { createDocumentsService } from "./services/documents/index.mjs";

const tracing = createTracing();

tracing.start();

const postgres = createPostgres();
const jwks = createIdentityJwks();
const documents = createDocumentsService({ db: postgres.db });

const app = await createApp({
  db: postgres.db,
  documents,
  fastifyOtel: tracing.fastifyOtel,
  jwks,
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
