import { once } from "node:events";
import process from "node:process";

import { createContext } from "./platform/context.mjs";
import { ensureTenancyStream } from "./platform/messaging/tenancy-stream.mjs";
import { runOutboxPublisher } from "./publishers/outbox.mjs";

const ctx = await createContext();
const controller = new AbortController();

await ensureTenancyStream(ctx);

const publisher = runOutboxPublisher(ctx, controller.signal);
const tasks = [publisher];

const worker = Promise.race(tasks).then(() => {
  throw new Error("tenancy worker stopped unexpectedly");
});

console.log("tenancy worker listening");

const [signal] = await Promise.race([
  ...["SIGINT", "SIGTERM", "SIGUSR2"].map((code) => once(process, code)),
  worker,
]);

console.log("closing worker", { signal });

controller.abort();

await Promise.allSettled([publisher]);

console.log("closing context...");
await ctx.lifecycle.close();
console.log("shutdown complete");
