import { runTenancyConsumer } from "./consumers/tenancy.mjs";
import { createContext } from "./platform/context.mjs";
import { ensureTenancyConsumer } from "./platform/messaging/tenancy-consumer.mjs";
import { ensureTenancyStream } from "./platform/messaging/tenancy-stream.mjs";
import { runOutboxPublisher } from "./publishers/outbox.mjs";

const controller = new AbortController();

const shutdown = () => {
  if (controller.signal.aborted) return;

  console.log("shutdown initiated");
  controller.abort();
};

// SIGUSR2 is for nodemon.
for (const signal of ["SIGINT", "SIGTERM", "SIGUSR2"]) {
  process.once(signal, shutdown);
}

let ctx;

try {
  ctx = await createContext();

  await ensureTenancyStream(ctx);
  await ensureTenancyConsumer(ctx);

  if (!controller.signal.aborted) {
    console.log("tenancy worker listening");

    await Promise.all([
      runTenancyConsumer(ctx, controller.signal),
      runOutboxPublisher(ctx, controller.signal),
    ]);
  }
} catch (err) {
  console.error("fatal tenancy worker error", err);
  process.exitCode = 1;
  shutdown();
} finally {
  if (ctx) {
    try {
      console.log("closing context...");
      await ctx.lifecycle.close();
    } catch (err) {
      console.error("error closing context", err);
      process.exitCode = 1;
    }
  }

  console.log("shutdown complete");
}
