import { createHash } from "node:crypto";

/**
 * @param {{ pool: import("pg").Pool }} resources
 * @returns {(args: { refresh_token: string }) => Promise<void>}
 */
export const revokeSession =
  ({ pool }) =>
  async ({ refresh_token }) => {
    if (!refresh_token || typeof refresh_token !== "string") {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    const tokenHash = createHash("sha256").update(refresh_token).digest();

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
