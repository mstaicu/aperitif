import { createHash } from "node:crypto";

/**
 * @param {{ pool: import("pg").Pool }} resources
 * @returns {(args: { session_token: string }) => Promise<void>}
 */
export const revokeSession =
  ({ pool }) =>
  async ({ session_token }) => {
    if (!session_token || typeof session_token !== "string") {
      throw new Error("INVALID_SESSION_TOKEN");
    }

    const tokenHash = createHash("sha256").update(session_token).digest();

    const {
      rows: [session],
    } = await pool.query(
      `
        UPDATE sessions
        SET revoked_at = NOW()
        WHERE token_hash = $1
          AND revoked_at IS NULL
          AND expires_at > NOW()
        RETURNING id
      `,
      [tokenHash],
    );

    if (!session) {
      throw new Error("SESSION_NOT_FOUND");
    }
  };
