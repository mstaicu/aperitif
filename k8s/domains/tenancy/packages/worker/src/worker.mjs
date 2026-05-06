import { once } from "node:events";
import process from "node:process";

import { runTenancyConsumer } from "./consumers/tenancy.mjs";
import { createContext } from "./platform/context.mjs";
import { ensureTenancyConsumer } from "./platform/messaging/tenancy-consumer.mjs";
import { ensureTenancyStream } from "./platform/messaging/tenancy-stream.mjs";
import { runOutboxPublisher } from "./publishers/outbox.mjs";

const ctx = await createContext();
const controller = new AbortController();

await ensureTenancyStream(ctx);
await ensureTenancyConsumer(ctx);

const consumer = runTenancyConsumer(ctx, controller.signal);
const publisher = runOutboxPublisher(ctx, controller.signal);

const worker = Promise.race([consumer, publisher]).then(() => {
  throw new Error("tenancy worker stopped unexpectedly");
});

console.log("tenancy worker listening");

const [signal] = await Promise.race([
  ...["SIGINT", "SIGTERM", "SIGUSR2"].map((code) => once(process, code)),
  worker,
]);

console.log("closing worker", { signal });

controller.abort();

await Promise.allSettled([consumer, publisher]);

console.log("closing context...");
await ctx.lifecycle.close();
console.log("shutdown complete");
