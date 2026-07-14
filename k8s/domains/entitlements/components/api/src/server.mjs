import { createRemoteJWKSet } from "jose";
import { once } from "node:events";
import process from "node:process";
import { Pool } from "pg";

import { createApp } from "./app.mjs";
import { createTracing } from "./platform/tracing.mjs";
import { createAccountEntitlementsService } from "./services/account-entitlements/index.mjs";
import { createEntitlementsService } from "./services/entitlements/index.mjs";

await using tracing = createTracing();

tracing.start();

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

db.on("error", (err) => console.error(err));

const jwks = createRemoteJWKSet(
  new URL(/** @type {string} */ (process.env.IDENTITY_JWKS_URL)),
);
const accountEntitlements = createAccountEntitlementsService({
  db,
});
const entitlements = createEntitlementsService({ db });

await using app = await createApp({
  accountEntitlements,
  db,
  entitlements,
  fastifyOtel: tracing.fastifyOtel,
  jwks,
});

app.addHook("onClose", () => db.end());

await app.listen({ host: "0.0.0.0", port: 3000 });

const [signal] = await Promise.race(
  ["SIGINT", "SIGTERM", "SIGUSR2"].map((code) => once(process, code)),
);

app.log.info({ signal }, "closing server");
