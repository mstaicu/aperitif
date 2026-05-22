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
        if (!PROJECTED_SUBJECTS.has(message.subject)) {
          message.ack();
          continue;
        }

        const event = message.json();

        if (
          !FeaturesEventEnvelopeCheck.Check(event) ||
          event.subject !== message.subject
        ) {
          console.warn("ignoring invalid features event envelope", {
            subject: message.subject,
          });
          message.ack();
          continue;
        }

        if (
          event.schema_version === FEATURES_EVENT_SCHEMA_VERSION &&
          event.subject === TenantFeaturesUpdatedSubject
        ) {
          if (!TenantFeaturesUpdatedPayloadCheck.Check(event.payload)) {
            throw new Error("Invalid features tenant features updated payload");
          }

          await projectV1TenantFeaturesUpdated(ctx, event);

          message.ack();
          continue;
        }

        throw new Error("Unsupported features event");
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
 * @param {import("../events/features/index.mjs").FeaturesEventEnvelope} event
 */
async function projectV1TenantFeaturesUpdated(ctx, event) {
  const payload =
    /** @type {import("../events/features/index.mjs").TenantFeaturesUpdatedPayload} */ (
      event.payload
    );
  const client = await ctx.persistence.db.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        INSERT INTO tenant_feature_projection (
          tenant_id,
          features,
          version
        )
        VALUES ($1, $2::jsonb, $3)
        ON CONFLICT (tenant_id) DO UPDATE
        SET features = EXCLUDED.features,
          version = EXCLUDED.version
        WHERE tenant_feature_projection.version < EXCLUDED.version
      `,
      [payload.tenant.id, JSON.stringify(payload.features), event.version],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});

    throw err;
  } finally {
    client.release();
  }
}
