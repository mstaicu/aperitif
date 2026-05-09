import {
  TENANCY_EVENT_SCHEMA_VERSION as TENANCY_EVENT_SCHEMA_VERSION_V1,
  TenancyEventEnvelopeCheck,
} from "../events/index.mjs";
import { TENANCY_CONSUMER } from "../platform/messaging/tenancy-consumer.mjs";
import { TENANCY_STREAM } from "../platform/messaging/tenancy-stream.mjs";
import {
  handleTenancyProjectionV1Event,
  isTenancyProjectionV1Subject,
} from "./tenancy-projection/versions/v1.mjs";

/**
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 * @param {AbortSignal} signal
 */
export async function runTenancyProjectionConsumer(ctx, signal) {
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
        await handleTenancyEvent(ctx, message);
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
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 * @param {import("@nats-io/jetstream").JsMsg} message
 */
async function handleTenancyEvent(ctx, message) {
  const event = message.json();

  if (
    !TenancyEventEnvelopeCheck.Check(event) ||
    event.subject !== message.subject
  ) {
    throw new Error("Invalid tenancy event envelope");
  }

  if (event.schema_version === TENANCY_EVENT_SCHEMA_VERSION_V1) {
    await handleTenancyProjectionV1Event(ctx, event);
    return;
  }

  if (isTenancyProjectionV1Subject(event.subject)) {
    throw new Error("Unsupported tenancy projection event schema version");
  }
}
