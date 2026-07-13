import { once } from "node:events";
import process from "node:process";

import { createHealthServer } from "./platform/health.mjs";
import { createEntitlementsStream } from "./platform/messaging/entitlements-stream.mjs";
import { getNc } from "./platform/nats.mjs";
import { createPostgres } from "./platform/postgres.mjs";
import { runProjectAccounts } from "./tasks/project-accounts.mjs";
import { runPublishOutbox } from "./tasks/publish-outbox.mjs";

const controller = new AbortController();
await using postgres = createPostgres();
await using nc = await getNc(controller.signal);

await createEntitlementsStream({
  nc,
  streamMaxBytes: Number(process.env.NATS_STREAM_MAX_BYTES),
  streamReplicas: Number(process.env.NATS_STREAM_REPLICAS),
});

await using health = createHealthServer({ db: postgres.db, nc });
health.listen(3000, "0.0.0.0");

const tasks = [
  runProjectAccounts({ db: postgres.db, nc }, controller.signal),
  runPublishOutbox({ db: postgres.db, nc }, controller.signal),
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

await Promise.race([...tasks, shutdown]).finally(async () => {
  console.log(
    JSON.stringify({
      event: "worker_closing",
      level: "info",
      service: "entitlements-worker",
    }),
  );

  controller.abort();

  await Promise.allSettled(tasks);
});
