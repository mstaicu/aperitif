import { buildTenantFeaturesUpdatedEvent } from "../../events/index.mjs";
import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: {
 *   grantRef: string,
 *   productCode: string,
 *   tenantId: string,
 * }) => Promise<{ tenant_id: string }>}
 */
export const createTenantProductGrant =
  (ctx) =>
  async ({ grantRef, productCode, tenantId }) => {
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
        rows: [product],
      } = await client.query(
        `
          SELECT 1
          FROM products
          WHERE code = $1
        `,
        [productCode],
      );

      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
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
          SELECT $1,
            feature_code,
            value,
            'product',
            $3
          FROM product_features
          WHERE product_code = $2
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
        [tenantId, productCode, grantRef],
      );

      const changed = (result.rowCount ?? 0) > 0;

      if (changed) {
        const {
          rows: [{ version }],
        } = await client.query(
          `
            SELECT nextval('features_version_seq') AS version
          `,
        );

        await client.query(
          `
            DELETE FROM tenant_features
            WHERE tenant_id = $1
          `,
          [tenantId],
        );

        const { rows } = await client.query(
          `
            SELECT d.code,
              d.type,
              d.merge_strategy,
              jsonb_agg(g.value ORDER BY g.grant_type, g.grant_ref) AS values
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

        /** @type {{ code: string, merge_strategy: string, type: "boolean" | "number", values: unknown[] }[]} */
        const grants = rows;

        /** @type {{ code: string, type: "boolean" | "number", value: unknown }[]} */
        const tenantFeatures = [];

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
            type: grant.type,
            value: mergedValue,
          });
        }

        for (const tenantFeature of tenantFeatures) {
          await client.query(
            `
              INSERT INTO tenant_features (
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

        const event = buildTenantFeaturesUpdatedEvent({
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
            event.subject,
            tenantId,
            version,
            event.schema_version,
            JSON.stringify(event.payload),
          ],
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
