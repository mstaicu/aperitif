import { DatabaseError } from "pg";

import { buildTenantFeaturesUpdatedEvent } from "../../events/index.mjs";

/**
 * @typedef {object} FeatureGrantInput
 * @property {string} feature_id
 * @property {string} grant_id
 * @property {unknown} value
 */

/**
 * @typedef {object} FeatureGrantRow
 * @property {string | undefined} [grant_id]
 * @property {string | null} id
 * @property {"boolean_or" | "number_max" | "number_sum" | null} merge_strategy
 * @property {unknown} value
 * @property {"boolean" | "number" | null} value_type
 */

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: {
 *   features: FeatureGrantInput[],
 *   tenantId: string,
 * }) => Promise<{ tenant_id: string }>}
 */
export const addTenantFeatures =
  (ctx) =>
  async ({ features, tenantId }) => {
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

      /** @type {{ rows: FeatureGrantRow[] }} */
      const grantsResult = await client.query(
        `
          SELECT f.id,
            g.value,
            f.merge_strategy,
            f.value_type
          FROM tenant_features g
          JOIN features f ON g.feature_id = f.id
          WHERE g.tenant_id = $1
          ORDER BY f.id
        `,
        [tenantId],
      );
      const { rows: grants } = grantsResult;

      /** @type {{ rows: FeatureGrantRow[] }} */
      const requestedGrantsResult = await client.query(
        `
          SELECT incoming.grant_id,
            f.id,
            incoming.value,
            f.merge_strategy,
            f.value_type
          FROM jsonb_to_recordset($1::jsonb) AS incoming(
            feature_id TEXT,
            grant_id UUID,
            value JSONB
          )
          LEFT JOIN features f ON f.id = incoming.feature_id
          ORDER BY f.id
        `,
        [JSON.stringify(features)],
      );
      const { rows: requestedGrants } = requestedGrantsResult;

      const pendingGrants = [...grants, ...requestedGrants];

      /** @type {Map<string, { id: string, value: unknown }>} */
      const tenantFeaturesById = new Map();

      for (const grant of pendingGrants) {
        if (!grant.id || !grant.merge_strategy || !grant.value_type) {
          throw new Error("FEATURE_NOT_FOUND");
        }

        if (
          grant.value_type === "boolean" &&
          typeof grant.value !== "boolean"
        ) {
          throw new Error("INVALID_FEATURE_VALUE");
        }

        if (
          grant.value_type === "number" &&
          (typeof grant.value !== "number" || !Number.isFinite(grant.value))
        ) {
          throw new Error("INVALID_FEATURE_VALUE");
        }

        const current = tenantFeaturesById.get(grant.id);

        if (!current) {
          tenantFeaturesById.set(grant.id, {
            id: grant.id,
            value: grant.value,
          });
          continue;
        }

        switch (grant.merge_strategy) {
          case "boolean_or":
            current.value = current.value === true || grant.value === true;
            break;

          case "number_max":
            current.value = Math.max(
              Number(current.value),
              Number(grant.value),
            );
            break;

          case "number_sum":
            current.value = Number(current.value) + Number(grant.value);
            break;

          default:
            throw new Error("UNKNOWN_MERGE_STRATEGY");
        }
      }

      const tenantFeatures = [...tenantFeaturesById.values()];

      const {
        rows: [{ version }],
      } = await client.query(
        `
          SELECT nextval('features_version_seq') AS version
        `,
      );

      await client.query(
        `
          INSERT INTO tenant_features (
            tenant_id,
            grant_id,
            feature_id,
            value
          )
          SELECT $1,
            incoming.grant_id,
            incoming.id,
            incoming.value
          FROM jsonb_to_recordset($2::jsonb) AS incoming(
            grant_id UUID,
            id TEXT,
            value JSONB
          )
        `,
        [tenantId, JSON.stringify(requestedGrants)],
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

      await client.query("COMMIT");

      return {
        tenant_id: tenantId,
      };
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});

      if (err instanceof DatabaseError) {
        if (err.code === "23505" && err.constraint === "tenant_features_pkey") {
          throw new Error("FEATURE_GRANT_DUPLICATE", { cause: err });
        }

        if (
          err.code?.startsWith("08") ||
          err.code === "53300" ||
          err.code === "57P01" ||
          err.code === "57P02" ||
          err.code === "57P03" ||
          err.code === "57014"
        ) {
          throw new Error("DATABASE_UNAVAILABLE", { cause: err });
        }
      }

      throw err;
    } finally {
      client?.release();
    }
  };
