import { buildTenantFeaturesUpdatedEvent } from "../../events/index.mjs";
import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: {
 *   featureCode: string,
 *   grantRef: string,
 *   tenantId: string,
 *   value: unknown,
 * }) => Promise<{ tenant_id: string }>}
 */
export const createTenantFeatureGrant =
  (ctx) =>
  async ({ featureCode, grantRef, tenantId, value }) => {
    let client;

    try {
      client = await ctx.persistence.db.connect();
      await client.query("BEGIN");

      const {
        rows: [tenant],
      } = await client.query(
        `
          SELECT tenant_id
          FROM tenant_projection
          WHERE tenant_id = $1
            AND status = 'active'
          FOR UPDATE
        `,
        [tenantId],
      );

      if (!tenant) {
        throw new Error("TENANT_NOT_FOUND");
      }

      const {
        rows: [feature],
      } = await client.query(
        `
          SELECT code,
            type
          FROM feature_definitions
          WHERE code = $1
        `,
        [featureCode],
      );

      if (!feature) {
        throw new Error("FEATURE_NOT_FOUND");
      }

      if (
        (feature.type === "boolean" && typeof value !== "boolean") ||
        (feature.type === "number" && typeof value !== "number")
      ) {
        throw new Error("INVALID_FEATURE_VALUE");
      }

      const result = await client.query(
        `
          INSERT INTO tenant_feature_grants (
            tenant_id,
            feature_code,
            value,
            grant_type,
            grant_ref
          )
          VALUES ($1, $2, $3::jsonb, 'manual', $4)
          ON CONFLICT (
            tenant_id,
            feature_code,
            grant_type,
            grant_ref
          )
          DO UPDATE
          SET value = EXCLUDED.value
          WHERE tenant_feature_grants.value IS DISTINCT FROM EXCLUDED.value
          RETURNING 1
        `,
        [tenantId, feature.code, JSON.stringify(value), grantRef],
      );

      if ((result.rowCount ?? 0) === 0) {
        await client.query("COMMIT");

        return {
          tenant_id: tenantId,
        };
      }

      const {
        rows: [{ version }],
      } = await client.query(
        `
          SELECT nextval('features_version_seq') AS version
        `,
      );

      await client.query(
        `
          DELETE FROM tenant_effective_features
          WHERE tenant_id = $1
        `,
        [tenantId],
      );

      const { rows: grants } = await client.query(
        `
          SELECT d.code,
            d.type,
            d.merge_strategy,
            g.value
          FROM tenant_feature_grants g
          JOIN feature_definitions d ON d.code = g.feature_code
          WHERE g.tenant_id = $1
          ORDER BY d.code
        `,
        [tenantId],
      );

      /** @type {{ code: string, type: "boolean" | "number", value: unknown }[]} */
      const tenantFeatures = [];
      let currentCode = "";
      let currentType = "";
      let currentStrategy = "";
      let values = [];

      for (const grant of grants) {
        if (currentCode && grant.code !== currentCode) {
          tenantFeatures.push({
            code: currentCode,
            type: /** @type {"boolean" | "number"} */ (currentType),
            value: mergeValues(currentStrategy, values),
          });

          values = [];
        }

        currentCode = grant.code;
        currentType = grant.type;
        currentStrategy = grant.merge_strategy;
        values.push(grant.value);
      }

      if (currentCode) {
        tenantFeatures.push({
          code: currentCode,
          type: /** @type {"boolean" | "number"} */ (currentType),
          value: mergeValues(currentStrategy, values),
        });
      }

      for (const tenantFeature of tenantFeatures) {
        await client.query(
          `
            INSERT INTO tenant_effective_features (
              tenant_id,
              feature_code,
              value,
              version
            )
            VALUES ($1, $2, $3::jsonb, $4)
          `,
          [
            tenantId,
            tenantFeature.code,
            JSON.stringify(tenantFeature.value),
            version,
          ],
        );
      }

      const tenantFeaturesUpdatedEvent = buildTenantFeaturesUpdatedEvent({
        features: tenantFeatures,
        tenant: {
          id: tenantId,
        },
      });

      await client.query(
        `
          INSERT INTO outbox_events (
            subject,
            tenant_id,
            version,
            schema_version,
            payload
          )
          VALUES ($1, $2, $3, $4, $5::jsonb)
        `,
        [
          tenantFeaturesUpdatedEvent.subject,
          tenantId,
          version,
          tenantFeaturesUpdatedEvent.schema_version,
          JSON.stringify(tenantFeaturesUpdatedEvent.payload),
        ],
      );

      await client.query("COMMIT");

      return {
        tenant_id: tenantId,
      };
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});

      if (isDatabaseUnavailable(err)) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    } finally {
      client?.release();
    }
  };

/**
 * @param {string} strategy
 * @param {unknown[]} values
 */
function mergeValues(strategy, values) {
  switch (strategy) {
    case "boolean_or":
      return values.some((value) => value === true);

    case "number_max":
      return Math.max(...values.map(Number));

    case "number_sum":
      return values.map(Number).reduce((sum, value) => sum + value, 0);

    default:
      throw new Error("UNKNOWN_MERGE_STRATEGY");
  }
}
