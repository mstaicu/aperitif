/**
 * @param {{ pool: import("pg").Pool }} resources
 * @param {{ currentUserId: string }} args
 * @returns {Promise<{
 *   accounts: {
 *     id: string,
 *     name: string,
 *     type: "individual" | "organization",
 *   }[],
 * }>}
 */
export const listAccounts = async ({ pool }, { currentUserId }) => {
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
