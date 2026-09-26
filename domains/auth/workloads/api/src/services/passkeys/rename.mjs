/**
 * @param {{ pool: import("pg").Pool }} resources
 * @param {{ id: string, name: string, userId: string }} args
 */
export async function renamePasskey({ pool }, { id, name, userId }) {
  const normalizedName = name.trim();

  if (normalizedName.length < 1 || normalizedName.length > 100) {
    throw new Error("INVALID_PASSKEY_NAME");
  }

  const {
    rows: [passkey],
  } = await pool.query(
    `
      UPDATE passkey_credentials
      SET name = $1
      WHERE id = $2
        AND user_id = $3
      RETURNING id, name, created_at
    `,
    [normalizedName, id, userId],
  );

  if (!passkey) throw new Error("PASSKEY_NOT_FOUND");

  return passkey;
}
