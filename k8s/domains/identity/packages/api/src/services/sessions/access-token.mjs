import { SignJWT } from "jose";
import { createHash } from "node:crypto";
import { DatabaseError } from "pg";

const TTL_SECONDS = 60;

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

    let operator;

    try {
      ({
        rows: [session],
      } = await runtime.persistence.db.query(
        `
          SELECT s.user_id
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

      const {
        rows: [operatorUser],
      } = await runtime.persistence.db.query(
        `
          SELECT 1
          FROM operators
          WHERE user_id = $1
        `,
        [session.user_id],
      );

      operator = Boolean(operatorUser);
    } catch (err) {
      if (err instanceof DatabaseError) {
        if (
          err.code?.startsWith("08") ||
          err.code === "53300" ||
          err.code === "57P01" ||
          err.code === "57P02" ||
          err.code === "57P03" ||
          err.code === "57014"
        ) {
          throw new Error("DATABASE_UNAVAILABLE", { cause: err });
        }
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

    if (operator) {
      claims.operator = true;
    }

    const access_token = await new SignJWT(claims)
      .setProtectedHeader({
        alg: "ES256",
        kid: runtime.security.signing.kid,
      })
      .setAudience(runtime.security.audience)
      .setIssuedAt(now)
      .setExpirationTime(now + TTL_SECONDS)
      .sign(runtime.security.signing.privateKey);

    return {
      access_token,
    };
  };
