/**
 * @param {{ pool: import("pg").Pool }} resources
 * @returns {(args: {
 *   accountId: string,
 *   currentUserId: string,
 * }) => Promise<{
 *   members: { role: "owner" | "member", user_id: string }[],
 * }>}
 */
export const listMembers =
  ({ pool }) =>
  async ({ accountId, currentUserId }) => {
    const { rows } = await pool.query(
      `
        SELECT member.user_id,
          member.role
        FROM account_members owner
        JOIN account_members member
          ON member.account_id = owner.account_id
        WHERE owner.account_id = $1
          AND owner.user_id = $2
          AND owner.role = 'owner'
        ORDER BY member.user_id
      `,
      [accountId, currentUserId],
    );

    if (rows.length === 0) {
      throw new Error("ACCOUNT_OWNER_REQUIRED");
    }

    return {
      members: rows.map((row) => ({
        role: row.role,
        user_id: row.user_id,
      })),
    };
  };
