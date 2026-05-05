import { TENANCY_CONSUMER } from "../platform/messaging/tenancy-consumer.mjs";
import { TENANCY_STREAM } from "../platform/messaging/tenancy-stream.mjs";

/**
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 * @param {AbortSignal} signal
 */
export async function runTenancyConsumer(ctx, signal) {
  const consumer = await ctx.messaging.js.consumers.get(
    TENANCY_STREAM,
    TENANCY_CONSUMER,
  );
  const messages = await consumer.consume({ max_messages: 1 });

  const stop = () => messages.stop();
  signal.addEventListener("abort", stop, { once: true });

  try {
    for await (const message of messages) {
      if (signal.aborted) return;

      try {
        await handleTenancyEvent(message);
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
async function handleTenancyEvent(message) {
  console.log("received tenancy event", message.subject);
}
