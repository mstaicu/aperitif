/**
 * @param {{ pool: import("pg").Pool }} resources
 * @returns {(args: { currentUserId: string }) => Promise<{
 *   accounts: {
 *     id: string,
 *     name: string,
 *     type: "personal" | "organization",
 *   }[],
 * }>}
 */
export const listAccounts =
  ({ pool }) =>
  async ({ currentUserId }) => {
    const { rows } = await pool.query(
      `
        SELECT a.id,
          a.name,
          a.type
        FROM account_members am
        JOIN accounts a ON a.id = am.account_id
        WHERE am.user_id = $1
        ORDER BY a.name, a.id
      `,
      [currentUserId],
    );

    return {
      accounts: rows.map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
      })),
    };
  };
