import { buildAccountMemberUpdatedV1Event } from "@mstaicu/accounts-contracts";
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
export const updateMember =
  ({ pool }) =>
  async ({ accountId, currentUserId, role, userId }) => {
    let client;

    try {
      client = await pool.connect();
      await client.query("BEGIN");

      const { rows: members } = await client.query(
        `
          SELECT user_id, role
          FROM account_members
          WHERE account_id = $1
          ORDER BY user_id
          FOR UPDATE
        `,
        [accountId],
      );
      const owner = members.find(
        (member) => member.user_id === currentUserId && member.role === "owner",
      );
      const member = members.find((entry) => entry.user_id === userId);

      if (!owner) {
        throw new Error("ACCOUNT_OWNER_REQUIRED");
      }

      if (!member) {
        throw new Error("ACCOUNT_MEMBER_NOT_FOUND");
      }

      if (
        member.role === "owner" &&
        role === "member" &&
        members.filter((entry) => entry.role === "owner").length === 1
      ) {
        throw new Error("ACCOUNT_LAST_OWNER");
      }

      if (member.role !== role) {
        await client.query(
          `
            UPDATE account_members
            SET role = $3
            WHERE account_id = $1
              AND user_id = $2
          `,
          [accountId, userId, role],
        );

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
        const event = buildAccountMemberUpdatedV1Event(
          {
            account_id: accountId,
            member: {
              role,
              user_id: userId,
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
      }

      await client.query("COMMIT");

      return {
        member: {
          role,
          user_id: userId,
        },
      };
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client?.release();
    }
  };
