/**
 * @param {{ pool: import("pg").Pool }} resources
 * @param {{ userId: string }} args
 */
export async function listPasskeys({ pool }, { userId }) {
  const { rows } = await pool.query(
    `
      SELECT id, name, created_at
      FROM passkey_credentials
      WHERE user_id = $1
      ORDER BY created_at, id
    `,
    [userId],
  );

  return rows;
}
