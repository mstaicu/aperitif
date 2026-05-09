import { once } from "node:events";
import process from "node:process";

import { runTenancyProjectionConsumer } from "./consumers/tenancy-projection.mjs";
import { createContext } from "./platform/context.mjs";
import { ensureFeaturesStream } from "./platform/messaging/features-stream.mjs";
import { ensureTenancyConsumer } from "./platform/messaging/tenancy-consumer.mjs";
import { runOutboxPublisher } from "./publishers/outbox.mjs";

const ctx = await createContext();
const controller = new AbortController();

await ensureFeaturesStream(ctx);
await ensureTenancyConsumer(ctx);

const consumer = runTenancyProjectionConsumer(ctx, controller.signal);
const publisher = runOutboxPublisher(ctx, controller.signal);
const tasks = [consumer, publisher];

const worker = Promise.race(tasks).then(() => {
  throw new Error("features worker stopped unexpectedly");
});

console.log("features worker listening");

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
