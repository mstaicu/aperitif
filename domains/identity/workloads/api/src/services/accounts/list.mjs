/**
 * @param {{ pool: import("pg").Pool }} resources
 * @param {{ currentUserId: string }} args
 */
export const listAccounts = async ({ pool }, { currentUserId }) => {
  const { rows } = await pool.query(
    `
      SELECT a.id,
        a.name,
        a.created_at,
        am.role
      FROM account_memberships am
      JOIN accounts a ON a.id = am.account_id
      WHERE am.user_id = $1
        AND am.status = 'active'
      ORDER BY a.name, a.id
    `,
    [currentUserId],
  );

  return {
    accounts: rows.map((account) => ({
      created_at: account.created_at.toISOString(),
      id: account.id,
      name: account.name,
      role: account.role,
    })),
  };
};
