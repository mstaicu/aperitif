import { connect } from "@nats-io/transport-node";
import { once } from "node:events";
import process from "node:process";
import { Pool } from "pg";

import { createHealthServer } from "./platform/health.mjs";
import { createAccountsStream } from "./platform/messaging/accounts-stream.mjs";
import { runPublishOutbox } from "./tasks/publish-outbox.mjs";

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
    name: "accounts-outbox-publisher",
    servers: [natsUrl],
    timeout: 2_000,
  }),
);

await createAccountsStream({
  nc,
  streamMaxBytes: Number(process.env.NATS_STREAM_MAX_BYTES),
  streamReplicas: Number(process.env.NATS_STREAM_REPLICAS),
});

const health = resources.use(createHealthServer({ db, nc }));
health.listen(3000, "0.0.0.0");

const task = runPublishOutbox({ db, nc }, controller.signal);
const shutdown = Promise.race(
  ["SIGINT", "SIGTERM", "SIGUSR2"].map((name) => once(process, name)),
);

console.log(
  JSON.stringify({
    event: "worker_started",
    level: "info",
    service: "accounts-outbox-publisher",
  }),
);

await Promise.race([task, shutdown]).finally(async () => {
  console.log(
    JSON.stringify({
      event: "worker_closing",
      level: "info",
      service: "accounts-outbox-publisher",
    }),
  );

  controller.abort();

  await Promise.allSettled([task]);
});
