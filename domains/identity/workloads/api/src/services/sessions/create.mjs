import { createHash, randomBytes } from "node:crypto";

/**
 * @param {{ client: import("pg").PoolClient, principalId: string }} resources
 */
export async function createSession({ client, principalId }) {
  const sessionToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(sessionToken).digest();

  const {
    rows: [session],
  } = await client.query(
    `
      INSERT INTO sessions (
        principal_id,
        token_hash,
        expires_at
      )
      VALUES ($1, $2, NOW() + INTERVAL '30 days')
      RETURNING EXTRACT(EPOCH FROM (expires_at - now()))::int AS expires_in
    `,
    [principalId, tokenHash],
  );

  return {
    expiresIn: session.expires_in,
    sessionToken,
  };
}
