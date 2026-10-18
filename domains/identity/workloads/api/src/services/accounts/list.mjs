/**
 * @param {{ pool: import("pg").Pool }} resources
 * @param {{ principalId: string }} args
 */
export const listAccounts = async ({ pool }, { principalId }) => {
  const { rows } = await pool.query(
    `
      SELECT a.id,
        a.name,
        a.created_at,
        ARRAY(
          SELECT amr.role
          FROM account_membership_roles amr
          WHERE amr.membership_id = am.id
          ORDER BY amr.role
        ) AS roles
      FROM account_memberships am
      JOIN accounts a ON a.id = am.account_id
      WHERE am.principal_id = $1
      ORDER BY a.name, a.id
    `,
    [principalId],
  );

  return {
    accounts: rows.map((account) => ({
      created_at: account.created_at.toISOString(),
      id: account.id,
      name: account.name,
      roles: account.roles,
    })),
  };
};
