import { once } from "node:events";
import http from "node:http";
import process from "node:process";

import { createContext } from "./platform/context.mjs";
import { ensureAccountsStream } from "./platform/messaging/accounts-stream.mjs";
import { runPublishOutbox } from "./tasks/publish-outbox.mjs";

const ctx = await createContext();
const controller = new AbortController();

await ensureAccountsStream(ctx);

const health = http.createServer(async (req, res) => {
  if (req.url === "/livez") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }

  if (req.url === "/readyz") {
    try {
      await ctx.persistence.db.query("SELECT 1");
      await ctx.messaging.nc.flush();

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

const tasks = [runPublishOutbox(ctx, controller.signal)];
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
  await ctx.lifecycle.close();
  console.log(
    JSON.stringify({
      event: "worker_stopped",
      level: "info",
      service: "accounts-worker",
    }),
  );
}
