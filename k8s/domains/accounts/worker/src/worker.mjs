import { runAccountsConsumer } from "./consumers/accounts.mjs";
import { createContext } from "./platform/context.mjs";
import { ensureAccountsConsumer } from "./platform/messaging/accounts-consumer.mjs";
import { ensureAccountsStream } from "./platform/messaging/accounts-stream.mjs";
import { runOutboxPublisher } from "./publishers/outbox.mjs";

const ctx = await createContext();
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

try {
  await ensureAccountsStream(ctx);
  await ensureAccountsConsumer(ctx);

  console.log("accounts worker listening");

  await Promise.all([
    runAccountsConsumer(ctx, controller.signal),
    runOutboxPublisher(ctx, controller.signal),
  ]);
} catch (err) {
  console.error("fatal accounts worker error", err);
  process.exitCode = 1;
  shutdown();
} finally {
  try {
    console.log("closing context...");
    await ctx.lifecycle.close();
  } catch (err) {
    console.error("error closing context", err);
    process.exitCode = 1;
  }

  console.log("shutdown complete");
}
