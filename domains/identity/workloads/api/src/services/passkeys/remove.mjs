/**
 * @param {{ pool: import("pg").Pool }} resources
 * @param {{ id: string, userId: string }} args
 */
export async function removePasskey({ pool }, { id, userId }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [
      userId,
    ]);

    const { rows: passkeys } = await client.query(
      `
        SELECT id
        FROM passkey_credentials
        WHERE user_id = $1
      `,
      [userId],
    );

    if (!passkeys.some((passkey) => passkey.id === id)) {
      throw new Error("PASSKEY_NOT_FOUND");
    }

    if (passkeys.length === 1) {
      throw new Error("LAST_AUTHENTICATION_METHOD");
    }

    await client.query(
      `
        DELETE FROM passkey_credentials
        WHERE id = $1
          AND user_id = $2
      `,
      [id, userId],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
