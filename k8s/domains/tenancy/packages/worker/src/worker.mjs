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
  if (req.url === "/livez" || req.url === "/readyz") {
    res.writeHead(200, { "content-type": "text/plain" });
  } else {
    res.writeHead(404, { "content-type": "text/plain" });
  }

  res.end();
});

health.listen(3000, "0.0.0.0");

const tasks = [runPublishOutbox(ctx, controller.signal)];

console.log("tenancy worker listening");

await Promise.race([
  ...["SIGINT", "SIGTERM", "SIGUSR2"].map((code) => once(process, code)),
  ...tasks,
]);

console.log("closing worker");

controller.abort();

await Promise.allSettled(tasks);

health.close();

console.log("closing context...");
await ctx.lifecycle.close();
console.log("shutdown complete");
