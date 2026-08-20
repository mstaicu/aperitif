import { SignJWT } from "jose";
import { createHash } from "node:crypto";

/**
 * @param {{
 *   pool: import("pg").Pool,
 *   signingKey: import("../../platform/jwt-keys.mjs").JwtKeys["signingKey"],
 * }} resources
 * @returns {(args: { session_token: string }) => Promise<{
 *   access_token: string,
 *   expires_in: 300,
 *   token_type: "Bearer",
 * }>}
 */
export const createAccessToken =
  ({ pool, signingKey }) =>
  async ({ session_token }) => {
    if (!session_token || typeof session_token !== "string") {
      throw new Error("INVALID_SESSION_TOKEN");
    }

    const tokenHash = createHash("sha256").update(session_token).digest();

    const {
      rows: [session],
    } = await pool.query(
      `
        SELECT
          s.user_id,
          EXISTS (
            SELECT 1
            FROM operators o
            WHERE o.user_id = s.user_id
          ) AS operator
        FROM sessions s
        WHERE s.token_hash = $1
          AND s.revoked_at IS NULL
          AND s.expires_at > NOW()
      `,
      [tokenHash],
    );

    if (!session) {
      throw new Error("SESSION_NOT_FOUND");
    }

    /** @type {{ operator?: true, sub: string }} */
    const claims = {
      sub: session.user_id,
      ...(session.operator ? { operator: /** @type {const} */ (true) } : {}),
    };

    const access_token = await new SignJWT(claims)
      .setProtectedHeader({
        alg: "ES256",
        kid: signingKey.kid,
      })
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(signingKey.privateKey);

    return {
      access_token,
      expires_in: 300,
      token_type: /** @type {const} */ ("Bearer"),
    };
  };
