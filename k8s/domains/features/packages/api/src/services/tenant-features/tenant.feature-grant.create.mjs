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
          SELECT 1
          FROM tenant_projection
          WHERE tenant_id = $1
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
          SELECT type
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
            grant_ref
          )
          VALUES ($1, $2, $3::jsonb, $4)
          ON CONFLICT (
            tenant_id,
            feature_code,
            grant_ref
          )
          DO UPDATE
          SET value = EXCLUDED.value
          WHERE tenant_feature_grants.value IS DISTINCT FROM EXCLUDED.value
          RETURNING 1
        `,
        [tenantId, featureCode, JSON.stringify(value), grantRef],
      );

      const changed = (result.rowCount ?? 0) > 0;

      if (changed) {
        const versionResult = await client.query(
          `
            SELECT nextval('features_version_seq') AS version
          `,
        );
        const version = versionResult.rows[0].version;

        await client.query(
          `
            DELETE FROM tenant_features
            WHERE tenant_id = $1
          `,
          [tenantId],
        );

        const { rows: grantRows } = await client.query(
          `
            SELECT d.code,
              d.type,
              d.merge_strategy,
              jsonb_agg(g.value ORDER BY g.grant_ref) AS values
            FROM tenant_feature_grants g
            JOIN feature_definitions d ON d.code = g.feature_code
            WHERE g.tenant_id = $1
            GROUP BY d.code,
              d.type,
              d.merge_strategy
            ORDER BY d.code
          `,
          [tenantId],
        );

        /** @type {{ code: string, value: unknown }[]} */
        const tenantFeatures = [];

        /** @type {{ code: string, merge_strategy: string, type: "boolean" | "number", values: unknown[] }[]} */
        const grants = grantRows;

        for (const grant of grants) {
          let mergedValue;

          switch (grant.merge_strategy) {
            case "boolean_or":
              mergedValue = grant.values.some(
                (grantValue) => grantValue === true,
              );
              break;

            case "number_max":
              mergedValue = Math.max(...grant.values.map(Number));
              break;

            case "number_sum":
              mergedValue = grant.values
                .map(Number)
                .reduce((sum, grantValue) => sum + grantValue, 0);
              break;

            default:
              throw new Error("UNKNOWN_MERGE_STRATEGY");
          }

          tenantFeatures.push({
            code: grant.code,
            value: mergedValue,
          });
        }

        await client.query(
          `
            INSERT INTO tenant_features (
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
          [tenantId, JSON.stringify(tenantFeatures), version],
        );

        const event = buildTenantFeaturesUpdatedEvent(
          {
            features: tenantFeatures,
            tenant: {
              id: tenantId,
            },
          },
          Number(version),
        );

        await client.query(
          `
            INSERT INTO outbox_events (
              id,
              event
            )
            VALUES ($1, $2::jsonb)
          `,
          [event.id, JSON.stringify(event)],
        );
      }

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
