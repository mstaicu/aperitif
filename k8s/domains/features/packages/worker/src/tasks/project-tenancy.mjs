import { addAbortListener } from "node:events";

import {
  TENANCY_EVENT_SCHEMA_VERSION,
  TenancyEventEnvelopeCheck,
  TenantUpdatedPayloadCheck,
  TenantUpdatedSubject,
} from "../events/index.mjs";
import { TENANCY_CONSUMER } from "../platform/messaging/tenancy-consumer.mjs";
import { TENANCY_STREAM } from "../platform/messaging/tenancy-stream.mjs";

/**
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 * @param {AbortSignal} signal
 */
export async function runProjectTenancy(ctx, signal) {
  signal.throwIfAborted();

  const consumer = await ctx.messaging.js.consumers.get(
    TENANCY_STREAM,
    TENANCY_CONSUMER,
  );
  const messages = await consumer.consume({ max_messages: 1 });
  const stopOnAbort = addAbortListener(signal, () => messages.stop());

  try {
    for await (const message of messages) {
      signal.throwIfAborted();

      try {
        await handleTenancyEvent(ctx, message);
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
async function handleTenancyEvent(ctx, message) {
  if (message.subject !== TenantUpdatedSubject) {
    return;
  }

  const event = message.json();

  if (
    !TenancyEventEnvelopeCheck.Check(event) ||
    event.subject !== message.subject
  ) {
    console.warn("ignoring invalid tenancy event envelope", {
      subject: message.subject,
    });
    return;
  }

  if (event.schema_version !== TENANCY_EVENT_SCHEMA_VERSION) {
    throw new Error("Unsupported tenancy event schema version");
  }

  await projectTenancyEvent(ctx, event);
}

/**
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 * @param {import("../events/index.mjs").TenancyEventEnvelope} event
 */
async function projectTenancyEvent(ctx, event) {
  if (event.subject !== TenantUpdatedSubject) {
    return;
  }

  if (!TenantUpdatedPayloadCheck.Check(event.payload)) {
    throw new Error("Invalid tenancy tenant updated payload");
  }

  const tenant = event.payload.tenant;
  const client = await ctx.persistence.db.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        INSERT INTO tenant_projection (
          tenant_id,
          version
        )
        VALUES ($1, $2)
        ON CONFLICT (tenant_id) DO UPDATE
        SET version = EXCLUDED.version
        WHERE tenant_projection.version < EXCLUDED.version
      `,
      [tenant.id, event.version],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});

    throw err;
  } finally {
    client.release();
  }
}
