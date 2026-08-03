import { buildAccountEntitlementsUpdatedV1Event } from "@mstaicu/entitlements-contracts";
import { DatabaseError } from "pg";

import { createError } from "../../platform/problem-details.mjs";
import { resolveEntitlements } from "../entitlements/entitlements.resolve.mjs";

/**
 * @typedef {object} Capability
 * @property {string} id
 * @property {boolean | number} value
 */

/**
 * @typedef {object} CapabilityDefinition
 * @property {string} id
 * @property {"boolean" | "number"} type
 */

/**
 * @param {{ pool: import("pg").Pool }} resources
 * @returns {(args: {
 *   accountId: string,
 *   capabilities: Capability[],
 *   grantId: string,
 * }) => Promise<{
 *   grant: {
 *     account_id: string,
 *     capabilities: Capability[],
 *     id: string,
 *   },
 * }>}
 */
export const set =
  ({ pool }) =>
  async ({ accountId, capabilities, grantId }) => {
    let client;

    try {
      client = await pool.connect();
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
        throw createError("ACCOUNT_NOT_FOUND");
      }

      if (
        new Set(capabilities.map((capability) => capability.id)).size !==
        capabilities.length
      ) {
        throw createError("DUPLICATE_CAPABILITY");
      }

      /** @type {{ rows: CapabilityDefinition[] }} */
      const { rows: definitions } = await client.query(
        `
          SELECT id, type
          FROM capabilities
          WHERE id = ANY($1::text[])
        `,
        [capabilities.map((capability) => capability.id)],
      );

      const definitionsById = new Map(
        definitions.map((definition) => [definition.id, definition]),
      );

      for (const capability of capabilities) {
        const definition = definitionsById.get(capability.id);

        if (!definition) {
          throw createError("CAPABILITY_NOT_FOUND");
        }

        if (
          definition.type === "boolean" &&
          typeof capability.value !== "boolean"
        ) {
          throw createError("INVALID_CAPABILITY_VALUE");
        }

        if (
          definition.type === "number" &&
          (typeof capability.value !== "number" ||
            !Number.isFinite(capability.value))
        ) {
          throw createError("INVALID_CAPABILITY_VALUE");
        }
      }

      await client.query(
        `
          DELETE FROM grants
          WHERE account_id = $1
            AND grant_id = $2
        `,
        [accountId, grantId],
      );

      for (const capability of capabilities) {
        await client.query(
          `
            INSERT INTO grants (
              account_id,
              grant_id,
              capability_id,
              value
            )
            VALUES ($1, $2, $3, $4::jsonb)
          `,
          [accountId, grantId, capability.id, JSON.stringify(capability.value)],
        );
      }

      const {
        rows: [{ version }],
      } = await client.query(
        `
          SELECT nextval('account_entitlements_version_seq') AS version
        `,
      );

      const event = buildAccountEntitlementsUpdatedV1Event(
        {
          account: {
            id: accountId,
          },
          entitlements: await resolveEntitlements({
            accountId,
            client,
          }),
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
        grant: {
          account_id: accountId,
          capabilities,
          id: grantId,
        },
      };
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});

      if (
        (err instanceof DatabaseError &&
          (err.code?.startsWith("08") ||
            err.code === "57P01" ||
            err.code === "57P03" ||
            err.code === "53300")) ||
        (Error.isError(err) &&
          "code" in err &&
          "syscall" in err &&
          typeof err.code === "string")
      ) {
        throw createError("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    } finally {
      client?.release();
    }
  };
