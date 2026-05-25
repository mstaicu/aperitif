import { once } from "node:events";
import http from "node:http";
import process from "node:process";

import { createContext } from "./platform/context.mjs";
import { ensureTenancyStream } from "./platform/messaging/tenancy-stream.mjs";
import { runPublishOutbox } from "./tasks/publish-outbox.mjs";

const ctx = await createContext();
const controller = new AbortController();

await ensureTenancyStream(ctx);

const health = http.createServer((req, res) => {
  res.writeHead(req.url === "/livez" || req.url === "/readyz" ? 200 : 404, {
    "content-type": "text/plain",
  });
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
    service: "tenancy-worker",
  }),
);

try {
  await Promise.race([...tasks, shutdown]);
} finally {
  console.log(
    JSON.stringify({
      event: "worker_closing",
      level: "info",
      service: "tenancy-worker",
    }),
  );

  controller.abort();

  await Promise.allSettled(tasks);

  health.close();

  console.log(
    JSON.stringify({
      event: "context_closing",
      level: "info",
      service: "tenancy-worker",
    }),
  );
  await ctx.lifecycle.close();
  console.log(
    JSON.stringify({
      event: "worker_stopped",
      level: "info",
      service: "tenancy-worker",
    }),
  );
}
