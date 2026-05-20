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
const signal = Promise.race(
  ["SIGINT", "SIGTERM", "SIGUSR2"].map((name) => once(process, name)),
);
const taskFailure = Promise.race(tasks).then(() => {
  throw new Error("worker task stopped unexpectedly");
});

console.log("tenancy worker listening");

try {
  await Promise.race([signal, taskFailure]);
} finally {
  console.log("closing worker");

  controller.abort();

  await Promise.allSettled(tasks);

  health.close();

  console.log("closing context...");
  await ctx.lifecycle.close();
  console.log("shutdown complete");
}
