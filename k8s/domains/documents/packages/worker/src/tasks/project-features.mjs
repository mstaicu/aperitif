import { addAbortListener } from "node:events";

import {
  FEATURES_EVENT_SCHEMA_VERSION,
  FeaturesEventEnvelopeCheck,
  TenantFeaturesUpdatedPayloadCheck,
  TenantFeaturesUpdatedSubject,
} from "../events/features/index.mjs";
import { FEATURES_CONSUMER } from "../platform/messaging/features-consumer.mjs";
import { FEATURES_STREAM } from "../platform/messaging/features-stream.mjs";

const PROJECTED_SUBJECTS = new Set([TenantFeaturesUpdatedSubject]);

/**
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 * @param {AbortSignal} signal
 */
export async function runProjectFeatures(ctx, signal) {
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
  if (!PROJECTED_SUBJECTS.has(message.subject)) {
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

  if (event.schema_version !== FEATURES_EVENT_SCHEMA_VERSION) {
    throw new Error("Unsupported features event schema version");
  }

  await projectFeaturesEvent(ctx, event);
}

/**
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 * @param {import("../events/features/index.mjs").FeaturesEventEnvelope} event
 */
async function projectFeaturesEvent(ctx, event) {
  if (!TenantFeaturesUpdatedPayloadCheck.Check(event.payload)) {
    throw new Error("Invalid features tenant features updated payload");
  }

  const tenantId = event.payload.tenant.id;
  const client = await ctx.persistence.db.connect();

  try {
    await client.query("BEGIN");

    const {
      rows: [state],
    } = await client.query(
      `
        SELECT max(version) AS version
        FROM tenant_feature_projection
        WHERE tenant_id = $1
      `,
      [tenantId],
    );

    if (state?.version && Number(state.version) >= event.version) {
      await client.query("COMMIT");
      return;
    }

    await client.query(
      `
        DELETE FROM tenant_feature_projection
        WHERE tenant_id = $1
      `,
      [tenantId],
    );

    await client.query(
      `
        INSERT INTO tenant_feature_projection (
          tenant_id,
          feature_code,
          value,
          version
        )
        SELECT $1,
          feature->>'code',
          feature->'value',
          $3
        FROM jsonb_array_elements($2::jsonb) AS feature
      `,
      [tenantId, JSON.stringify(event.payload.features), event.version],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});

    throw err;
  } finally {
    client.release();
  }
}
