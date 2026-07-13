import { once } from "node:events";
import process from "node:process";

import { createHealthServer } from "./platform/health.mjs";
import { ensureAccountsConsumer } from "./platform/messaging/accounts-consumer.mjs";
import { ensureEntitlementsConsumer } from "./platform/messaging/entitlements-consumer.mjs";
import { createNats } from "./platform/nats.mjs";
import { createPostgres } from "./platform/postgres.mjs";
import { runProjectAccounts } from "./tasks/project-accounts.mjs";
import { runProjectEntitlements } from "./tasks/project-entitlements.mjs";

const controller = new AbortController();
await using postgres = createPostgres();
await using nats = await createNats();

await ensureEntitlementsConsumer({ nats });
await ensureAccountsConsumer({ nats });

await using health = createHealthServer({ db: postgres.db, nats });
health.listen(3000, "0.0.0.0");

const tasks = [
  runProjectEntitlements({ db: postgres.db, nats }, controller.signal),
  runProjectAccounts({ db: postgres.db, nats }, controller.signal),
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

try {
  await Promise.race([...tasks, shutdown]);
} finally {
  console.log(
    JSON.stringify({
      event: "worker_closing",
      level: "info",
      service: "documents-worker",
    }),
  );

  controller.abort();

  await Promise.allSettled(tasks);
}
