import { buildAccountMemberCreatedV1Event } from "@mstaicu/accounts-contracts";
import { context, propagation } from "@opentelemetry/api";

/**
 * @param {{ pool: import("pg").Pool }} resources
 * @returns {(args: {
 *   accountId: string,
 *   currentUserId: string,
 *   role: "owner" | "member",
 *   userId: string,
 * }) => Promise<{
 *   member: { role: "owner" | "member", user_id: string },
 * }>}
 */
export const createMember =
  ({ pool }) =>
  async ({ accountId, currentUserId, role, userId }) => {
    let client;

    try {
      client = await pool.connect();
      await client.query("BEGIN");

      const {
        rows: [owner],
      } = await client.query(
        `
          SELECT role
          FROM account_members
          WHERE account_id = $1
            AND user_id = $2
          FOR UPDATE
        `,
        [accountId, currentUserId],
      );

      if (owner?.role !== "owner") {
        throw new Error("ACCOUNT_OWNER_REQUIRED");
      }

      const {
        rows: [member],
      } = await client.query(
        `
          INSERT INTO account_members (
            account_id,
            user_id,
            role
          )
          VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING
          RETURNING user_id, role
        `,
        [accountId, userId, role],
      );

      if (!member) {
        throw new Error("ACCOUNT_MEMBER_EXISTS");
      }

      const {
        rows: [account],
      } = await client.query(
        `
          UPDATE accounts
          SET version = version + 1
          WHERE id = $1
          RETURNING version
        `,
        [accountId],
      );
      const event = buildAccountMemberCreatedV1Event(
        {
          account_id: accountId,
          member: {
            role: member.role,
            user_id: member.user_id,
          },
        },
        Number(account.version),
      );
      const traceContext = /** @type {Record<string, string>} */ ({});

      propagation.inject(context.active(), traceContext);

      await client.query(
        `
          INSERT INTO outbox_events (
            id,
            event,
            traceparent,
            tracestate
          )
          VALUES ($1, $2::jsonb, $3, $4)
        `,
        [
          event.id,
          JSON.stringify(event),
          traceContext.traceparent,
          traceContext.tracestate,
        ],
      );

      await client.query("COMMIT");

      return {
        member: {
          role: member.role,
          user_id: member.user_id,
        },
      };
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client?.release();
    }
  };
