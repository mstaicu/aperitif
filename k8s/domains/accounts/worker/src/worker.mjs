import { createContext } from "./platform/context.mjs";
import { runOutboxPublisher } from "./publishers/outbox.mjs";
import { ensureAccountsStream } from "./streams/accounts.mjs";

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

  console.log("accounts worker listening");

  await runOutboxPublisher(ctx, controller.signal);
} catch (err) {
  console.error("fatal accounts worker error", err);
  process.exitCode = 1;
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
