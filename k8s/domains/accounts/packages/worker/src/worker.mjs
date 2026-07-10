import { once } from "node:events";
import process from "node:process";

import { createHealthServer } from "./platform/health.mjs";
import { ensureAccountsStream } from "./platform/messaging/accounts-stream.mjs";
import { createNats } from "./platform/nats.mjs";
import { createPostgres } from "./platform/postgres.mjs";
import { runPublishOutbox } from "./tasks/publish-outbox.mjs";

const controller = new AbortController();
await using postgres = createPostgres();
await using nats = await createNats();

await ensureAccountsStream({
  nats,
  streamReplicas: Number(process.env.NATS_STREAM_REPLICAS),
});

await using health = createHealthServer({ db: postgres.db, nats });
health.listen(3000, "0.0.0.0");

const tasks = [runPublishOutbox({ db: postgres.db, nats }, controller.signal)];
const shutdown = Promise.race(
  ["SIGINT", "SIGTERM", "SIGUSR2"].map((name) => once(process, name)),
);

console.log(
  JSON.stringify({
    event: "worker_started",
    level: "info",
    service: "accounts-worker",
  }),
);

try {
  await Promise.race([...tasks, shutdown]);
} finally {
  console.log(
    JSON.stringify({
      event: "worker_closing",
      level: "info",
      service: "accounts-worker",
    }),
  );

  controller.abort();

  await Promise.allSettled(tasks);
}
