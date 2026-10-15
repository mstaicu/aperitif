/**
 * @param {{ pool: import("pg").Pool }} resources
 * @param {{ id: string, principalId: string }} args
 */
export async function removePasskey({ pool }, { id, principalId }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `
        SELECT id
        FROM principals
        WHERE id = $1
        FOR NO KEY UPDATE
      `,
      [principalId],
    );

    const { rows: passkeys } = await client.query(
      `
        SELECT id
        FROM passkey_credentials
        WHERE principal_id = $1
      `,
      [principalId],
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
          AND principal_id = $2
      `,
      [id, principalId],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
