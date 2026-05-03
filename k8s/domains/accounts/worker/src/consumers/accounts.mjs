import { ACCOUNTS_CONSUMER } from "../platform/messaging/accounts-consumer.mjs";
import { ACCOUNTS_STREAM } from "../platform/messaging/accounts-stream.mjs";

/**
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 * @param {AbortSignal} signal
 */
export async function runAccountsConsumer(ctx, signal) {
  const consumer = await ctx.messaging.js.consumers.get(
    ACCOUNTS_STREAM,
    ACCOUNTS_CONSUMER,
  );
  const messages = await consumer.consume({ max_messages: 1 });

  const stop = () => messages.stop();
  signal.addEventListener("abort", stop, { once: true });

  try {
    for await (const message of messages) {
      if (signal.aborted) return;

      try {
        await handleAccountsEvent(message);
        message.ack();
      } catch (err) {
        message.nak();
        throw err;
      }
    }
  } finally {
    signal.removeEventListener("abort", stop);
    messages.stop();
  }
}

/**
 * @param {import("@nats-io/jetstream").JsMsg} message
 */
async function handleAccountsEvent(message) {
  console.log("received accounts event", message.subject);
}
