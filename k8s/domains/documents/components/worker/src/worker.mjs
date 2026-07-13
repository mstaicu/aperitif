import { once } from "node:events";
import process from "node:process";

import { createHealthServer } from "./platform/health.mjs";
import { getNc } from "./platform/nats.mjs";
import { createPostgres } from "./platform/postgres.mjs";
import { runProjectAccounts } from "./tasks/project-accounts.mjs";
import { runProjectEntitlements } from "./tasks/project-entitlements.mjs";

const controller = new AbortController();
await using postgres = createPostgres();
await using nc = await getNc(controller.signal);

await using health = createHealthServer({ db: postgres.db, nc });
health.listen(3000, "0.0.0.0");

const tasks = [
  runProjectEntitlements({ db: postgres.db, nc }, controller.signal),
  runProjectAccounts({ db: postgres.db, nc }, controller.signal),
];
const shutdown = Promise.race(
  ["SIGINT", "SIGTERM", "SIGUSR2"].map((name) => once(process, name)),
);

console.log(
  JSON.stringify({
    event: "worker_started",
    level: "info",
    service: "documents-worker",
  }),
);

await Promise.race([...tasks, shutdown]).finally(async () => {
  console.log(
    JSON.stringify({
      event: "worker_closing",
      level: "info",
      service: "documents-worker",
    }),
  );

  controller.abort();

  await Promise.allSettled(tasks);
});
