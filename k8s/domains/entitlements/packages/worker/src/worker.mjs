import { once } from "node:events";
import process from "node:process";

import { createHealthServer } from "./platform/health.mjs";
import { ensureAccountsConsumer } from "./platform/messaging/accounts-consumer.mjs";
import { ensureEntitlementsStream } from "./platform/messaging/entitlements-stream.mjs";
import { createNats } from "./platform/nats.mjs";
import { createPostgres } from "./platform/postgres.mjs";
import { runProjectAccounts } from "./tasks/project-accounts.mjs";
import { runPublishOutbox } from "./tasks/publish-outbox.mjs";

const streamMaxBytes = Number(process.env.NATS_STREAM_MAX_BYTES);
if (!Number.isSafeInteger(streamMaxBytes) || streamMaxBytes <= 0) {
  throw new Error("NATS_STREAM_MAX_BYTES must be a positive integer");
}

const controller = new AbortController();
await using postgres = createPostgres();
await using nats = await createNats();

await ensureEntitlementsStream({
  nats,
  streamMaxBytes,
  streamReplicas: Number(process.env.NATS_STREAM_REPLICAS),
});
await ensureAccountsConsumer({ nats });

await using health = createHealthServer({ db: postgres.db, nats });
health.listen(3000, "0.0.0.0");

const tasks = [
  runProjectAccounts({ db: postgres.db, nats }, controller.signal),
  runPublishOutbox({ db: postgres.db, nats }, controller.signal),
];
const shutdown = Promise.race(
  ["SIGINT", "SIGTERM", "SIGUSR2"].map((name) => once(process, name)),
);

console.log(
  JSON.stringify({
    event: "worker_started",
    level: "info",
    service: "entitlements-worker",
  }),
);

try {
  await Promise.race([...tasks, shutdown]);
} finally {
  console.log(
    JSON.stringify({
      event: "worker_closing",
      level: "info",
      service: "entitlements-worker",
    }),
  );

  controller.abort();

  await Promise.allSettled(tasks);
}
