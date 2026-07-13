import { buildAccountEntitlementsUpdatedV1Event } from "@mstaicu/entitlements-contracts";
import { DatabaseError } from "pg";

/**
 * @typedef {boolean | number} EntitlementValue
 * @typedef {"boolean_or" | "number_max" | "number_sum"} EntitlementMergeStrategy
 * @typedef {"boolean" | "number"} EntitlementValueType
 */

/**
 * @typedef {object} EntitlementGrantInput
 * @property {string} entitlement_id
 * @property {string} grant_id
 * @property {EntitlementValue} value
 */

/**
 * @typedef {object} EntitlementDefinition
 * @property {string} id
 * @property {EntitlementMergeStrategy} merge_strategy
 * @property {EntitlementValueType} value_type
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
 *   entitlements: EntitlementGrantInput[],
 *   accountId: string,
 * }) => Promise<{ account_id: string }>}
 */
export const addAccountEntitlements =
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
          SELECT id,
            merge_strategy,
            value_type
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
        const definition = entitlementDefinitionsById.get(
          entitlement.entitlement_id,
        );

        if (!entitlement.grant_id || !definition) {
          throw new Error("ENTITLEMENT_NOT_FOUND");
        }

        if (
          definition.value_type === "boolean" &&
          typeof entitlement.value !== "boolean"
        ) {
          throw new Error("INVALID_ENTITLEMENT_VALUE");
        }

        if (
          definition.value_type === "number" &&
          (typeof entitlement.value !== "number" ||
            !Number.isFinite(entitlement.value))
        ) {
          throw new Error("INVALID_ENTITLEMENT_VALUE");
        }
      }

      for (const entitlement of entitlements) {
        await client.query(
          `
            INSERT INTO account_entitlement_grants (
              account_id,
              grant_id,
              entitlement_id,
              value
            )
            VALUES ($1, $2, $3, $4::jsonb)
            ON CONFLICT (account_id, grant_id, entitlement_id)
            DO UPDATE SET value = EXCLUDED.value
          `,
          [
            accountId,
            entitlement.grant_id,
            entitlement.entitlement_id,
            JSON.stringify(entitlement.value),
          ],
        );
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

      const event = buildAccountEntitlementsUpdatedV1Event(
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
          event: "account_entitlement_grants_set",
          event_id: event.id,
          grant_count: entitlements.length,
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
