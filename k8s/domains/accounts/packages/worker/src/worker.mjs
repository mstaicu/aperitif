import { once } from "node:events";
import http from "node:http";
import process from "node:process";

import { ensureAccountsStream } from "./platform/messaging/accounts-stream.mjs";
import { createRuntime } from "./platform/runtime.mjs";
import { runPublishOutbox } from "./tasks/publish-outbox.mjs";

const runtime = await createRuntime();
const controller = new AbortController();

await ensureAccountsStream(runtime);

const health = http.createServer(async (req, res) => {
  if (req.url === "/livez") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }

  if (req.url === "/readyz") {
    try {
      await runtime.persistence.db.query("SELECT 1");
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

const tasks = [runPublishOutbox(runtime, controller.signal)];
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

  health.close();

  console.log(
    JSON.stringify({
      event: "context_closing",
      level: "info",
      service: "accounts-worker",
    }),
  );
  await runtime.lifecycle.close();
  console.log(
    JSON.stringify({
      event: "worker_stopped",
      level: "info",
      service: "accounts-worker",
    }),
  );
}
