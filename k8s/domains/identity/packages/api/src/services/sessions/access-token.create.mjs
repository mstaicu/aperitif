import { SignJWT } from "jose";
import { createHash } from "node:crypto";
import { DatabaseError } from "pg";

/**
 * @param {import("../../platform/runtime.mjs").Runtime} runtime
 * @returns {(args: { refresh_token: string }) => Promise<{ access_token: string }>}
 */
export const createAccessToken =
  (runtime) =>
  async ({ refresh_token }) => {
    if (!refresh_token || typeof refresh_token !== "string") {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    let session;

    try {
      ({
        rows: [session],
      } = await runtime.db.query(
        `
          SELECT
            s.user_id,
            EXISTS (
              SELECT 1
              FROM operators o
              WHERE o.user_id = s.user_id
            ) AS operator
          FROM session_refresh_tokens rt
          JOIN sessions s ON s.id = rt.session_id
          WHERE rt.token_hash = $1
            AND rt.consumed_at IS NULL
            AND s.revoked_at IS NULL
            AND s.expires_at > NOW()
        `,
        [createHash("sha256").update(refresh_token).digest()],
      ));

      if (!session) {
        throw new Error("SESSION_NOT_FOUND");
      }
    } catch (err) {
      if (
        (err instanceof DatabaseError &&
          (err.code?.startsWith("08") ||
            err.code === "57P01" ||
            err.code === "57P03" ||
            err.code === "53300")) ||
        (err instanceof Error &&
          "code" in err &&
          "syscall" in err &&
          typeof err.code === "string")
      ) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    }

    const now = Math.floor(Date.now() / 1000);

    /**
     * @type {{ operator?: true, sub: string }}
     */
    let claims = {
      sub: session.user_id,
    };

    if (session.operator) {
      claims.operator = true;
    }

    const access_token = await new SignJWT(claims)
      .setProtectedHeader({
        alg: "ES256",
        kid: runtime.security.signingKey.kid,
      })
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(runtime.security.signingKey.privateKey);

    return {
      access_token,
    };
  };
