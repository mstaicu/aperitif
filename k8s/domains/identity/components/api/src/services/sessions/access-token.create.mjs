import { SignJWT } from "jose";
import { createHash } from "node:crypto";
import { DatabaseError } from "pg";

import { createError } from "../../platform/problem-details.mjs";

/**
 * @param {{
 *   pool: import("pg").Pool,
 *   signingKey: import("../../platform/security/index.mjs").JwtKeys["signingKey"],
 * }} resources
 * @returns {(args: { refresh_token: string }) => Promise<{
 *   access_token: string,
 *   expires_in: 300,
 *   token_type: "Bearer",
 * }>}
 */
export const createAccessToken =
  ({ pool, signingKey }) =>
  async ({ refresh_token }) => {
    if (!refresh_token || typeof refresh_token !== "string") {
      throw createError("INVALID_REFRESH_TOKEN");
    }

    const tokenHash = createHash("sha256").update(refresh_token).digest();

    try {
      const {
        rows: [session],
      } = await pool.query(
        `
          UPDATE sessions s
          SET last_used_at = NOW()
          WHERE s.token_hash = $1
            AND s.revoked_at IS NULL
            AND s.expires_at > NOW()
          RETURNING
            s.id,
            s.user_id,
            EXISTS (
              SELECT 1
              FROM operators o
              WHERE o.user_id = s.user_id
            ) AS operator
        `,
        [tokenHash],
      );

      if (!session) {
        throw createError("SESSION_NOT_FOUND");
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

      console.log(
        JSON.stringify({
          event: "session_used",
          level: "info",
          session_id: session.id,
        }),
      );

      return {
        access_token,
        expires_in: 300,
        token_type: "Bearer",
      };
    } catch (err) {
      if (
        (err instanceof DatabaseError &&
          (err.code?.startsWith("08") ||
            err.code === "57P01" ||
            err.code === "57P03" ||
            err.code === "53300")) ||
        (Error.isError(err) &&
          "code" in err &&
          "syscall" in err &&
          typeof err.code === "string")
      ) {
        throw createError("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    }
  };
