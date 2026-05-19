import { addAbortListener } from "node:events";

import {
  FEATURES_EVENT_SCHEMA_VERSION as FEATURES_EVENT_SCHEMA_VERSION_V1,
  FeaturesEventEnvelopeCheck,
} from "../events/features/index.mjs";
import { FEATURES_CONSUMER } from "../platform/messaging/features-consumer.mjs";
import { FEATURES_STREAM } from "../platform/messaging/features-stream.mjs";
import {
  handleFeaturesProjectionV1Event,
  isFeaturesProjectionV1Subject,
} from "./features-projection/versions/v1.mjs";

/**
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 * @param {AbortSignal} signal
 */
export async function runFeaturesProjectionConsumer(ctx, signal) {
  signal.throwIfAborted();

  const consumer = await ctx.messaging.js.consumers.get(
    FEATURES_STREAM,
    FEATURES_CONSUMER,
  );
  const messages = await consumer.consume({ max_messages: 1 });
  const stopOnAbort = addAbortListener(signal, () => messages.stop());

  try {
    for await (const message of messages) {
      signal.throwIfAborted();

      try {
        await handleFeaturesEvent(ctx, message);
        message.ack();
      } catch (err) {
        message.nak();
        throw err;
      }
    }
  } finally {
    stopOnAbort[Symbol.dispose]();
    messages.stop();
  }
}

/**
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 * @param {import("@nats-io/jetstream").JsMsg} message
 */
async function handleFeaturesEvent(ctx, message) {
  if (!isFeaturesProjectionV1Subject(message.subject)) {
    return;
  }

  const event = message.json();

  if (
    !FeaturesEventEnvelopeCheck.Check(event) ||
    event.subject !== message.subject
  ) {
    console.warn("ignoring invalid features event envelope", {
      subject: message.subject,
    });
    return;
  }

  if (event.schema_version === FEATURES_EVENT_SCHEMA_VERSION_V1) {
    await handleFeaturesProjectionV1Event(ctx, event);
    return;
  }

  throw new Error("Unsupported features projection event schema version");
}
