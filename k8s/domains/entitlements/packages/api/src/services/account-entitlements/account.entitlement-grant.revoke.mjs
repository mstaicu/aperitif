import { buildAccountEntitlementsUpdatedEvent } from "@mstaicu/entitlements-contracts";
import { DatabaseError } from "pg";

/**
 * @typedef {boolean | number} EntitlementValue
 * @typedef {"boolean_or" | "number_max" | "number_sum"} EntitlementMergeStrategy
 * @typedef {"boolean" | "number"} EntitlementValueType
 */

/**
 * @typedef {object} EntitlementGrantRevokeInput
 * @property {string} entitlement_id
 * @property {string} grant_id
 */

/**
 * @typedef {object} EntitlementDefinition
 * @property {string} id
 */

/**
 * @typedef {object} StoredEntitlementGrant
 * @property {string} entitlement_id
 * @property {EntitlementMergeStrategy} merge_strategy
 * @property {EntitlementValue} value
 * @property {EntitlementValueType} value_type
 */

/**
 * @param {{ db: import("pg").Pool }} resources
 * @returns {(args: {
 *   entitlements: EntitlementGrantRevokeInput[],
 *   accountId: string,
 * }) => Promise<{ account_id: string }>}
 */
export const revokeAccountEntitlements =
  ({ db }) =>
  async ({ accountId, entitlements }) => {
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

      const entitlementIds = [
        ...new Set(
          entitlements.map((entitlement) => entitlement.entitlement_id),
        ),
      ];

      /** @type {{ rows: EntitlementDefinition[] }} */
      const { rows: entitlementDefinitions } = await client.query(
        `
          SELECT id
          FROM entitlements
          WHERE id = ANY($1::text[])
        `,
        [entitlementIds],
      );

      const entitlementDefinitionsById = new Map(
        entitlementDefinitions.map((entitlement) => [
          entitlement.id,
          entitlement,
        ]),
      );

      for (const entitlement of entitlements) {
        if (
          !entitlement.grant_id ||
          !entitlementDefinitionsById.has(entitlement.entitlement_id)
        ) {
          throw new Error("ENTITLEMENT_NOT_FOUND");
        }
      }

      let deletedCount = 0;

      for (const entitlement of entitlements) {
        const deleted = await client.query(
          `
            DELETE FROM account_entitlement_grants
            WHERE account_id = $1
              AND grant_id = $2
              AND entitlement_id = $3
          `,
          [accountId, entitlement.grant_id, entitlement.entitlement_id],
        );

        deletedCount += deleted.rowCount ?? 0;
      }

      if (deletedCount === 0) {
        await client.query("COMMIT");

        return {
          account_id: accountId,
        };
      }

      /** @type {{ rows: StoredEntitlementGrant[] }} */
      const { rows: grants } = await client.query(
        `
          SELECT g.entitlement_id,
            g.value,
            c.merge_strategy,
            c.value_type
          FROM account_entitlement_grants g
          JOIN entitlements c ON c.id = g.entitlement_id
          WHERE g.account_id = $1
          ORDER BY g.entitlement_id
        `,
        [accountId],
      );

      /** @type {Map<string, { id: string, value: EntitlementValue }>} */
      const accountEntitlementsById = new Map();

      for (const grant of grants) {
        if (
          grant.value_type === "boolean" &&
          typeof grant.value !== "boolean"
        ) {
          throw new Error("INVALID_ENTITLEMENT_VALUE");
        }

        if (
          grant.value_type === "number" &&
          (typeof grant.value !== "number" || !Number.isFinite(grant.value))
        ) {
          throw new Error("INVALID_ENTITLEMENT_VALUE");
        }

        const current = accountEntitlementsById.get(grant.entitlement_id);

        if (!current) {
          accountEntitlementsById.set(grant.entitlement_id, {
            id: grant.entitlement_id,
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

      const accountEntitlements = [...accountEntitlementsById.values()];

      const {
        rows: [{ version }],
      } = await client.query(
        `
          SELECT nextval('account_entitlements_version_seq') AS version
        `,
      );

      const event = buildAccountEntitlementsUpdatedEvent(
        {
          account: {
            id: accountId,
          },
          entitlements: accountEntitlements,
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
          entitlement_count: accountEntitlements.length,
          event: "account_entitlement_grants_revoked",
          event_id: event.id,
          grant_count: deletedCount,
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
