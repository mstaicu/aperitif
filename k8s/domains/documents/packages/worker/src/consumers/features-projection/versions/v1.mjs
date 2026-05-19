import {
  FEATURES_EVENT_SCHEMA_VERSION,
  TenantFeaturesUpdatedPayloadCheck,
  TenantFeaturesUpdatedSubject,
} from "../../../events/features/index.mjs";

const PROJECTED_SUBJECTS = new Set([TenantFeaturesUpdatedSubject]);

/**
 * @param {import("../../../platform/context.mjs").WorkerContext} ctx
 * @param {import("../../../events/features/index.mjs").FeaturesEventEnvelope} event
 */
export async function handleFeaturesProjectionV1Event(ctx, event) {
  if (!isFeaturesProjectionV1Subject(event.subject)) {
    return;
  }

  if (event.schema_version !== FEATURES_EVENT_SCHEMA_VERSION) {
    throw new Error("Unsupported features projection v1 event schema version");
  }

  if (!TenantFeaturesUpdatedPayloadCheck.Check(event.payload)) {
    console.warn("ignoring invalid features tenant features updated payload", {
      subject: event.subject,
    });
    return;
  }

  if (event.payload.tenant.id !== event.tenant_id) {
    console.warn("ignoring invalid features tenant id", {
      subject: event.subject,
    });
    return;
  }

  const client = await ctx.persistence.db.connect();

  try {
    await client.query("BEGIN");

    const {
      rows: [state],
    } = await client.query(
      `
        SELECT max(features_version) AS features_version
        FROM tenant_feature_projection
        WHERE tenant_id = $1
      `,
      [event.tenant_id],
    );

    if (
      state?.features_version &&
      Number(state.features_version) >= event.features_version
    ) {
      await client.query("COMMIT");
      return;
    }

    await client.query(
      `
        DELETE FROM tenant_feature_projection
        WHERE tenant_id = $1
      `,
      [event.tenant_id],
    );

    await client.query(
      `
        INSERT INTO tenant_feature_projection (
          tenant_id,
          feature_code,
          value,
          features_version
        )
        SELECT $1,
          feature->>'code',
          feature->'value',
          $3
        FROM jsonb_array_elements($2::jsonb) AS feature
      `,
      [
        event.tenant_id,
        JSON.stringify(event.payload.features),
        event.features_version,
      ],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});

    throw err;
  } finally {
    client.release();
  }
}

/**
 * @param {string} subject
 */
export function isFeaturesProjectionV1Subject(subject) {
  return PROJECTED_SUBJECTS.has(subject);
}
