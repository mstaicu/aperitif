import { once } from "node:events";
import http from "node:http";
import process from "node:process";

import { ensureAccountsConsumer } from "./platform/messaging/accounts-consumer.mjs";
import { ensureCapabilitiesStream } from "./platform/messaging/capabilities-stream.mjs";
import { createRuntime } from "./platform/runtime.mjs";
import { runProjectAccounts } from "./tasks/project-accounts.mjs";
import { runPublishOutbox } from "./tasks/publish-outbox.mjs";

const runtime = await createRuntime();
const controller = new AbortController();

await ensureCapabilitiesStream(runtime);
await ensureAccountsConsumer(runtime);

const health = http.createServer(async (req, res) => {
  if (req.url === "/livez") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }

  if (req.url === "/readyz") {
    try {
      await runtime.db.query("SELECT 1");
      await runtime.messaging.nc.flush();

      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok");
      return;
    } catch {
      res.writeHead(503, { "content-type": "text/plain" });
      res.end("not ready");
      return;
    }
  }

  res.writeHead(404, { "content-type": "text/plain" });
  res.end();
});

health.listen(3000, "0.0.0.0");

const tasks = [
  runProjectAccounts(runtime, controller.signal),
  runPublishOutbox(runtime, controller.signal),
];
const shutdown = Promise.race(
  ["SIGINT", "SIGTERM", "SIGUSR2"].map((name) => once(process, name)),
);

console.log(
  JSON.stringify({
    event: "worker_started",
    level: "info",
    service: "capabilities-worker",
  }),
);

try {
  await Promise.race([...tasks, shutdown]);
} finally {
  console.log(
    JSON.stringify({
      event: "worker_closing",
      level: "info",
      service: "capabilities-worker",
    }),
  );

  controller.abort();

  await Promise.allSettled(tasks);

  await health[Symbol.asyncDispose]();

  console.log(
    JSON.stringify({
      event: "context_closing",
      level: "info",
      service: "capabilities-worker",
    }),
  );
  await runtime.lifecycle.close();
  console.log(
    JSON.stringify({
      event: "worker_stopped",
      level: "info",
      service: "capabilities-worker",
    }),
  );
}
