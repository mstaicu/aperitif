/**
 * @param {{ pool: import("pg").Pool }} resources
 * @param {{ principalId: string }} args
 */
export async function listPasskeys({ pool }, { principalId }) {
  const { rows } = await pool.query(
    `
      SELECT id, name, created_at
      FROM passkey_credentials
      WHERE principal_id = $1
      ORDER BY created_at, id
    `,
    [principalId],
  );

  return rows;
}
