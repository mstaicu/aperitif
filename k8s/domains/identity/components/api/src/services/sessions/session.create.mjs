import { createHash, randomBytes } from "node:crypto";

/**
 * @param {{ client: import("pg").PoolClient, userId: string }} resources
 */
export async function createSession({ client, userId }) {
  const refreshToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(refreshToken).digest();

  await client.query(
    `
      INSERT INTO sessions (
        user_id,
        token_hash,
        expires_at
      )
      VALUES ($1, $2, NOW() + INTERVAL '30 days')
    `,
    [userId, tokenHash],
  );

  return {
    refreshToken,
  };
}
