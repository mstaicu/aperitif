import { once } from "node:events";
import process from "node:process";

import { runTenancyProjectionConsumer } from "./consumers/tenancy-projection.mjs";
import { createContext } from "./platform/context.mjs";
import { ensureTenancyConsumer } from "./platform/messaging/tenancy-consumer.mjs";

const ctx = await createContext();
const controller = new AbortController();

await ensureTenancyConsumer(ctx);

const consumer = runTenancyProjectionConsumer(ctx, controller.signal);

const worker = consumer.then(() => {
  throw new Error("features worker stopped unexpectedly");
});

console.log("features worker listening");

const [signal] = await Promise.race([
  ...["SIGINT", "SIGTERM", "SIGUSR2"].map((code) => once(process, code)),
  worker,
]);

console.log("closing worker", { signal });

controller.abort();

await Promise.allSettled([consumer]);

console.log("closing context...");
await ctx.lifecycle.close();
console.log("shutdown complete");
