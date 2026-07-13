import { connect } from "@nats-io/transport-node";
import { once } from "node:events";
import process from "node:process";
import { Pool } from "pg";

import { createHealthServer } from "./platform/health.mjs";
import { getEntitlementsConsumer } from "./platform/messaging/entitlements-consumer.mjs";
import { projectEntitlements } from "./tasks/project-entitlements.mjs";

const controller = new AbortController();
await using resources = new AsyncDisposableStack();
const natsUrl = /** @type {string} */ (process.env.NATS_URL);

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

resources.defer(() => db.end());

const nc = resources.use(
  await connect({
    name: "documents-entitlements-projector",
    servers: [natsUrl],
    timeout: 2_000,
  }),
);

const health = resources.use(createHealthServer({ db, nc }));
health.listen(3000, "0.0.0.0");

const task = getEntitlementsConsumer({ nc }, controller.signal).then(
  (consumer) => projectEntitlements({ consumer, db }, controller.signal),
);
const shutdown = Promise.race(
  ["SIGINT", "SIGTERM", "SIGUSR2"].map((name) => once(process, name)),
);

console.log(
  JSON.stringify({
    event: "worker_started",
    level: "info",
    service: "documents-entitlements-projector",
  }),
);

await Promise.race([task, shutdown]).finally(async () => {
  console.log(
    JSON.stringify({
      event: "worker_closing",
      level: "info",
      service: "documents-entitlements-projector",
    }),
  );

  controller.abort();
  await Promise.allSettled([task]);
});
