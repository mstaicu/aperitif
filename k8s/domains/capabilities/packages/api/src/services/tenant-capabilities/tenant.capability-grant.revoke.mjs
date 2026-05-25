import { DatabaseError } from "pg";

import { buildTenantCapabilitiesUpdatedEvent } from "../../events/index.mjs";

/**
 * @typedef {object} CapabilityGrantRevokeInput
 * @property {string} capability_id
 * @property {string} grant_id
 */

/**
 * @typedef {object} CapabilityGrantRow
 * @property {string | undefined} [grant_id]
 * @property {string | null} capability_id
 * @property {"boolean_or" | "number_max" | "number_sum" | null} merge_strategy
 * @property {unknown} value
 * @property {"boolean" | "number" | null} value_type
 */

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: {
 *   capabilities: CapabilityGrantRevokeInput[],
 *   tenantId: string,
 * }) => Promise<{ tenant_id: string }>}
 */
export const revokeTenantCapabilities =
  (ctx) =>
  async ({ capabilities, tenantId }) => {
    let client;

    try {
      client = await ctx.persistence.db.connect();
      await client.query("BEGIN");

      const {
        rows: [tenant],
      } = await client.query(
        `
          SELECT 1
          FROM projected_tenants
          WHERE tenant_id = $1
          FOR UPDATE
        `,
        [tenantId],
      );

      if (!tenant) {
        throw new Error("TENANT_NOT_FOUND");
      }

      /** @type {{ rows: CapabilityGrantRow[] }} */
      const requestedGrantsResult = await client.query(
        `
          SELECT incoming.grant_id,
            f.id AS capability_id,
            NULL::jsonb AS value,
            f.merge_strategy,
            f.value_type
          FROM jsonb_to_recordset($1::jsonb) AS incoming(
            capability_id TEXT,
            grant_id UUID
          )
          LEFT JOIN capabilities f ON f.id = incoming.capability_id
          ORDER BY f.id
        `,
        [JSON.stringify(capabilities)],
      );
      const { rows: requestedGrants } = requestedGrantsResult;

      for (const grant of requestedGrants) {
        if (
          !grant.grant_id ||
          !grant.capability_id ||
          !grant.merge_strategy ||
          !grant.value_type
        ) {
          throw new Error("CAPABILITY_NOT_FOUND");
        }
      }

      const deleted = await client.query(
        `
          DELETE FROM tenant_capability_grants g
          USING jsonb_to_recordset($2::jsonb) AS incoming(
            grant_id UUID,
            capability_id TEXT
          )
          WHERE g.tenant_id = $1
            AND g.grant_id = incoming.grant_id
            AND g.capability_id = incoming.capability_id
        `,
        [tenantId, JSON.stringify(requestedGrants)],
      );

      if (deleted.rowCount === 0) {
        await client.query("COMMIT");

        return {
          tenant_id: tenantId,
        };
      }

      /** @type {{ rows: CapabilityGrantRow[] }} */
      const grantsResult = await client.query(
        `
          SELECT f.id AS capability_id,
            g.value,
            f.merge_strategy,
            f.value_type
          FROM tenant_capability_grants g
          JOIN capabilities f ON g.capability_id = f.id
          WHERE g.tenant_id = $1
          ORDER BY f.id
        `,
        [tenantId],
      );
      const { rows: grants } = grantsResult;

      /** @type {Map<string, { id: string, value: unknown }>} */
      const tenantCapabilitiesById = new Map();

      for (const grant of grants) {
        if (
          !grant.capability_id ||
          !grant.merge_strategy ||
          !grant.value_type
        ) {
          throw new Error("CAPABILITY_NOT_FOUND");
        }

        if (
          grant.value_type === "boolean" &&
          typeof grant.value !== "boolean"
        ) {
          throw new Error("INVALID_CAPABILITY_VALUE");
        }

        if (
          grant.value_type === "number" &&
          (typeof grant.value !== "number" || !Number.isFinite(grant.value))
        ) {
          throw new Error("INVALID_CAPABILITY_VALUE");
        }

        const current = tenantCapabilitiesById.get(grant.capability_id);

        if (!current) {
          tenantCapabilitiesById.set(grant.capability_id, {
            id: grant.capability_id,
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

      const tenantCapabilities = [...tenantCapabilitiesById.values()];

      const {
        rows: [{ version }],
      } = await client.query(
        `
          SELECT nextval('tenant_capabilities_version_seq') AS version
        `,
      );

      const event = buildTenantCapabilitiesUpdatedEvent(
        {
          capabilities: tenantCapabilities,
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

      console.log(
        JSON.stringify({
          capability_count: tenantCapabilities.length,
          event: "tenant_capability_grants_revoked",
          event_id: event.id,
          grant_count: deleted.rowCount,
          level: "info",
          tenant_id: tenantId,
          version: Number(version),
        }),
      );

      return {
        tenant_id: tenantId,
      };
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});

      if (err instanceof DatabaseError) {
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
