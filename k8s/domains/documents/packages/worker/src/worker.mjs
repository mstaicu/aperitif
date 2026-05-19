import { once } from "node:events";
import process from "node:process";

import { runFeaturesProjectionConsumer } from "./consumers/features-projection.mjs";
import { runTenancyProjectionConsumer } from "./consumers/tenancy-projection.mjs";
import { createContext } from "./platform/context.mjs";
import { ensureFeaturesConsumer } from "./platform/messaging/features-consumer.mjs";
import { ensureTenancyConsumer } from "./platform/messaging/tenancy-consumer.mjs";

const ctx = await createContext();
const controller = new AbortController();

await ensureFeaturesConsumer(ctx);
await ensureTenancyConsumer(ctx);

const tasks = [
  runFeaturesProjectionConsumer(ctx, controller.signal),
  runTenancyProjectionConsumer(ctx, controller.signal),
];

const worker = Promise.race(tasks).then(() => {
  throw new Error("documents worker stopped unexpectedly");
});

console.log("documents worker listening");

const [signal] = await Promise.race([
  ...["SIGINT", "SIGTERM", "SIGUSR2"].map((code) => once(process, code)),
  worker,
]);

console.log("closing worker", { signal });

controller.abort();

await Promise.allSettled(tasks);

console.log("closing context...");
await ctx.lifecycle.close();
console.log("shutdown complete");
