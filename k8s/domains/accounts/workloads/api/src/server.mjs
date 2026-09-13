import { createRemoteJWKSet } from "jose";
import { once } from "node:events";
import process from "node:process";
import { Pool } from "pg";

import { buildApp } from "./app.mjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => console.error(err));

try {
  const jwks = createRemoteJWKSet(
    new URL(/** @type {string} */ (process.env.AUTH_JWKS_URL)),
  );

  await using app = buildApp({
    jwks,
    pool,
  });

  await app.listen({ host: "0.0.0.0", port: 3000 });

  const [signal] = await Promise.race(
    ["SIGINT", "SIGTERM", "SIGUSR2"].map((code) => once(process, code)),
  );

  app.log.info({ signal }, "closing server");
} finally {
  await pool.end();
}
