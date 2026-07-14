import { connect } from "@nats-io/transport-node";
import process from "node:process";
import { Pool } from "pg";

import { createHealthServer } from "./platform/health.mjs";
import { projections } from "./projections/index.mjs";
import { project } from "./projector.mjs";

const controller = new AbortController();

for (const signal of ["SIGINT", "SIGTERM", "SIGUSR2"]) {
  process.once(signal, () => controller.abort());
}

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

db.on("error", (err) => {
  console.error(
    JSON.stringify({
      event: "database_idle_client_error",
      level: "error",
      message: err.message,
    }),
  );
});

await using nc = await connect({
  name: "documents-entitlements-projector",
  servers: [/** @type {string} */ (process.env.NATS_URL)],
  timeout: 2_000,
});

await using health = createHealthServer({ db, nc });

health.listen(3000, "0.0.0.0");

await project({
  db,
  nc,
  projections,
  signal: controller.signal,
});

await db.end();
