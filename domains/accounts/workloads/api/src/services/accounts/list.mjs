/**
 * @param {{ pool: import("pg").Pool }} resources
 * @param {{ currentSubjectId: string }} args
 */
export const listAccounts = async ({ pool }, { currentSubjectId }) => {
  const { rows } = await pool.query(
    `
      SELECT a.id,
        a.name,
        a.created_at,
        am.role
      FROM account_memberships am
      JOIN accounts a ON a.id = am.account_id
      WHERE am.subject_id = $1
        AND am.status = 'active'
      ORDER BY a.name, a.id
    `,
    [currentSubjectId],
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
