import { once } from "node:events";
import process from "node:process";
import { Pool } from "pg";

import { buildApp } from "./app.mjs";
import { createJwtKeys } from "./platform/jwt-keys.mjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => console.error(err));

try {
  const { jwks, signingKey } = await createJwtKeys();

  await using app = buildApp({
    jwks,
    origin: /** @type {string} */ (process.env.ORIGIN),
    pool,
    signingKey,
  });

  await app.listen({ host: "0.0.0.0", port: 3000 });

  const [signal] = await Promise.race(
    ["SIGINT", "SIGTERM", "SIGUSR2"].map((code) => once(process, code)),
  );

  app.log.info({ signal }, "closing server");
} finally {
  await pool.end();
}
