import { once } from "node:events";
import http from "node:http";
import process from "node:process";

import { createContext } from "./platform/context.mjs";
import { ensureFeaturesConsumer } from "./platform/messaging/features-consumer.mjs";
import { ensureTenancyConsumer } from "./platform/messaging/tenancy-consumer.mjs";
import { runProjectFeatures } from "./tasks/project-features.mjs";
import { runProjectTenancy } from "./tasks/project-tenancy.mjs";

const ctx = await createContext();
const controller = new AbortController();

await ensureFeaturesConsumer(ctx);
await ensureTenancyConsumer(ctx);

const health = http.createServer((req, res) => {
  res.writeHead(req.url === "/livez" || req.url === "/readyz" ? 200 : 404, {
    "content-type": "text/plain",
  });
  res.end();
});

health.listen(3000, "0.0.0.0");

const tasks = [
  runProjectFeatures(ctx, controller.signal),
  runProjectTenancy(ctx, controller.signal),
];
const shutdown = Promise.race(
  ["SIGINT", "SIGTERM", "SIGUSR2"].map((name) => once(process, name)),
);

console.log("documents worker listening");

try {
  await Promise.race([...tasks, shutdown]);
} finally {
  console.log("closing worker");

  controller.abort();

  await Promise.allSettled(tasks);

  health.close();

  console.log("closing context...");
  await ctx.lifecycle.close();
  console.log("shutdown complete");
}
