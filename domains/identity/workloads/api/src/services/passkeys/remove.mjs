/**
 * Requires the caller's active transaction and an already authorized, locked principal.
 * @param {{ client: import("pg").PoolClient }} resources
 * @param {{ id: string, principalId: string }} args
 */
export async function removePasskey({ client }, { id, principalId }) {
  const { rows: passkeys } = await client.query(
    `
      SELECT id
      FROM passkey_credentials
      WHERE principal_id = $1
    `,
    [principalId],
  );

  if (!passkeys.some((passkey) => passkey.id === id.toLowerCase())) {
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

  await client.query("DELETE FROM sessions WHERE principal_id = $1", [
    principalId,
  ]);
}
