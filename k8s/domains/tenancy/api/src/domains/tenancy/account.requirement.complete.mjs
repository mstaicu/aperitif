import {
  AccountRequirementCompletedPayloadCheck,
  AccountRequirementCompletedSchemaVersion,
  AccountRequirementCompletedSubject,
  AccountUpdatedPayloadCheck,
  AccountUpdatedSchemaVersion,
  AccountUpdatedSubject,
  TENANCY_EVENT_PRODUCER,
} from "../../events/index.mjs";
import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { accountId: string, currentUserId: string, type: string }) => Promise<{
 *   count: number,
 *   requirements: {
 *     id: string,
 *     status: "pending" | "completed",
 *     type: string,
 *   }[],
 * }>}
 */
export const completeAccountRequirement =
  (ctx) =>
  async ({ accountId, currentUserId, type }) => {
    let client;

    try {
      client = await ctx.persistence.db.connect();
      await client.query("BEGIN");

      let {
        rows: [account],
      } = await client.query(
        `
          SELECT id, name, kind, status
          FROM accounts
          WHERE id = $1
          FOR UPDATE
        `,
        [accountId],
      );

      if (!account) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }

      const {
        rows: [membership],
      } = await client.query(
        `
          SELECT role
          FROM account_memberships
          WHERE account_id = $1
            AND user_id = $2
          FOR UPDATE
        `,
        [accountId, currentUserId],
      );

      if (!membership || membership.role !== "owner") {
        throw new Error("FORBIDDEN");
      }

      const {
        rows: [requirement],
      } = await client.query(
        `
          SELECT id, type, status
          FROM account_requirements
          WHERE account_id = $1
            AND type = $2
          FOR UPDATE
        `,
        [accountId, type],
      );

      if (!requirement) {
        throw new Error("ACCOUNT_REQUIREMENT_NOT_FOUND");
      }

      let completedRequirement = requirement;

      if (requirement.status !== "completed") {
        ({
          rows: [completedRequirement],
        } = await client.query(
          `
            UPDATE account_requirements
            SET status = 'completed'
            WHERE id = $1
            RETURNING id, type, status
          `,
          [requirement.id],
        ));

        const {
          rows: [{ version }],
        } = await client.query(
          `
            UPDATE accounts
            SET version = version + 1
            WHERE id = $1
            RETURNING version
          `,
          [accountId],
        );

        /** @type {import("../../events/index.mjs").AccountRequirementCompletedPayload} */
        const requirementCompletedPayload = {
          account: {
            id: account.id,
            kind: account.kind,
            name: account.name,
            status: account.status,
          },
          requirement: {
            account_id: accountId,
            status: "completed",
            type: completedRequirement.type,
          },
        };

        if (
          !AccountRequirementCompletedPayloadCheck.Check(
            requirementCompletedPayload,
          )
        ) {
          throw new Error("INVALID_EVENT_PAYLOAD");
        }

        await client.query(
          `
            INSERT INTO outbox_events (
              subject,
              version,
              producer,
              schema_version,
              payload
            )
            VALUES ($1, $2, $3, $4, $5::jsonb)
          `,
          [
            AccountRequirementCompletedSubject,
            version,
            TENANCY_EVENT_PRODUCER,
            AccountRequirementCompletedSchemaVersion,
            JSON.stringify(requirementCompletedPayload),
          ],
        );
      }

      const { rows: requirements } = await client.query(
        `
          SELECT id, type, status
          FROM account_requirements
          WHERE account_id = $1
          ORDER BY type
        `,
        [accountId],
      );

      const isComplete = requirements.every(
        (requirement) => requirement.status === "completed",
      );

      if (account.status === "pending" && isComplete) {
        ({
          rows: [account],
        } = await client.query(
          `
            UPDATE accounts
            SET status = 'active',
              version = version + 1
            WHERE id = $1
            RETURNING id, name, kind, status, version
          `,
          [accountId],
        ));

        /** @type {import("../../events/index.mjs").AccountUpdatedPayload} */
        const accountUpdatedPayload = {
          account: {
            id: account.id,
            kind: account.kind,
            name: account.name,
            status: account.status,
          },
        };

        if (!AccountUpdatedPayloadCheck.Check(accountUpdatedPayload)) {
          throw new Error("INVALID_EVENT_PAYLOAD");
        }

        await client.query(
          `
            INSERT INTO outbox_events (
              subject,
              version,
              producer,
              schema_version,
              payload
            )
            VALUES ($1, $2, $3, $4, $5::jsonb)
          `,
          [
            AccountUpdatedSubject,
            account.version,
            TENANCY_EVENT_PRODUCER,
            AccountUpdatedSchemaVersion,
            JSON.stringify(accountUpdatedPayload),
          ],
        );
      }

      await client.query("COMMIT");

      return {
        count: requirements.length,
        requirements: requirements.map((requirement) => ({
          id: requirement.id,
          status: requirement.status,
          type: requirement.type,
        })),
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
