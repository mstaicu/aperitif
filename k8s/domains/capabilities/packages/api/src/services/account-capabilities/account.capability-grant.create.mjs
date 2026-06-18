import { DatabaseError } from "pg";

import { buildAccountCapabilitiesUpdatedEvent } from "../../events/index.mjs";

/**
 * @typedef {object} CapabilityGrantInput
 * @property {string} capability_id
 * @property {string} grant_id
 * @property {boolean | number} value
 */

/**
 * @typedef {object} CapabilityDefinition
 * @property {string} id
 * @property {"boolean_or" | "number_max" | "number_sum"} merge_strategy
 * @property {"boolean" | "number"} value_type
 */

/**
 * @typedef {object} StoredCapabilityGrant
 * @property {string} capability_id
 * @property {"boolean_or" | "number_max" | "number_sum"} merge_strategy
 * @property {boolean | number} value
 * @property {"boolean" | "number"} value_type
 */

/**
 * @param {{ db: import("pg").Pool }} resources
 * @returns {(args: {
 *   capabilities: CapabilityGrantInput[],
 *   accountId: string,
 * }) => Promise<{ account_id: string }>}
 */
export const addAccountCapabilities =
  ({ db }) =>
  async ({ accountId, capabilities }) => {
    let client;

    try {
      client = await db.connect();
      await client.query("BEGIN");

      const {
        rows: [account],
      } = await client.query(
        `
          SELECT 1
          FROM projected_accounts
          WHERE account_id = $1
          FOR UPDATE
        `,
        [accountId],
      );

      if (!account) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }

      const capabilityIds = [
        ...new Set(capabilities.map((capability) => capability.capability_id)),
      ];

      /** @type {{ rows: CapabilityDefinition[] }} */
      const { rows: capabilityDefinitions } = await client.query(
        `
          SELECT id,
            merge_strategy,
            value_type
          FROM capabilities
          WHERE id = ANY($1::text[])
        `,
        [capabilityIds],
      );

      const capabilityDefinitionsById = new Map(
        capabilityDefinitions.map((capability) => [capability.id, capability]),
      );

      for (const capability of capabilities) {
        const definition = capabilityDefinitionsById.get(
          capability.capability_id,
        );

        if (!capability.grant_id || !definition) {
          throw new Error("CAPABILITY_NOT_FOUND");
        }

        if (
          definition.value_type === "boolean" &&
          typeof capability.value !== "boolean"
        ) {
          throw new Error("INVALID_CAPABILITY_VALUE");
        }

        if (
          definition.value_type === "number" &&
          (typeof capability.value !== "number" ||
            !Number.isFinite(capability.value))
        ) {
          throw new Error("INVALID_CAPABILITY_VALUE");
        }
      }

      for (const capability of capabilities) {
        await client.query(
          `
            INSERT INTO account_capability_grants (
              account_id,
              grant_id,
              capability_id,
              value
            )
            VALUES ($1, $2, $3, $4::jsonb)
            ON CONFLICT (account_id, grant_id, capability_id)
            DO UPDATE SET value = EXCLUDED.value
          `,
          [
            accountId,
            capability.grant_id,
            capability.capability_id,
            JSON.stringify(capability.value),
          ],
        );
      }

      /** @type {{ rows: StoredCapabilityGrant[] }} */
      const { rows: grants } = await client.query(
        `
          SELECT g.capability_id,
            g.value,
            c.merge_strategy,
            c.value_type
          FROM account_capability_grants g
          JOIN capabilities c ON c.id = g.capability_id
          WHERE g.account_id = $1
          ORDER BY g.capability_id
        `,
        [accountId],
      );

      /** @type {Map<string, { id: string, value: boolean | number }>} */
      const accountCapabilitiesById = new Map();

      for (const grant of grants) {
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

        const current = accountCapabilitiesById.get(grant.capability_id);

        if (!current) {
          accountCapabilitiesById.set(grant.capability_id, {
            id: grant.capability_id,
            value: grant.value,
          });
          continue;
        }

        if (grant.merge_strategy === "boolean_or") {
          current.value = current.value === true || grant.value === true;
        }

        if (grant.merge_strategy === "number_max") {
          current.value = Math.max(Number(current.value), Number(grant.value));
        }

        if (grant.merge_strategy === "number_sum") {
          current.value = Number(current.value) + Number(grant.value);
        }
      }

      const accountCapabilities = [...accountCapabilitiesById.values()];

      const {
        rows: [{ version }],
      } = await client.query(
        `
          SELECT nextval('account_capabilities_version_seq') AS version
        `,
      );

      const event = buildAccountCapabilitiesUpdatedEvent(
        {
          account: {
            id: accountId,
          },
          capabilities: accountCapabilities,
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
          account_id: accountId,
          capability_count: accountCapabilities.length,
          event: "account_capability_grants_set",
          event_id: event.id,
          grant_count: capabilities.length,
          level: "info",
          version: Number(version),
        }),
      );

      return {
        account_id: accountId,
      };
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});

      if (
        (err instanceof DatabaseError &&
          (err.code?.startsWith("08") ||
            err.code === "57P01" ||
            err.code === "57P03" ||
            err.code === "53300")) ||
        (err instanceof Error &&
          "code" in err &&
          "syscall" in err &&
          typeof err.code === "string")
      ) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    } finally {
      client?.release();
    }
  };
