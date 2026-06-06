import { SignJWT } from "jose";
import { createHash } from "node:crypto";
import { DatabaseError } from "pg";

const TTL_SECONDS = 60;

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { refresh_token: string }) => Promise<{ access_token: string }>}
 */
export const createAccessToken =
  (ctx) =>
  async ({ refresh_token }) => {
    if (!refresh_token || typeof refresh_token !== "string") {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    /** @type {string[]} */
    let operatorPermissions;
    let session;

    try {
      ({
        rows: [session],
      } = await ctx.persistence.db.query(
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

      const { rows: permissions } = await ctx.persistence.db.query(
        `
          SELECT DISTINCT p.id
          FROM operator_users ou
          JOIN operator_role_permissions rp
            ON rp.role_id = ou.role_id
          JOIN operator_permissions p
            ON rp.permission_id = p.id
          WHERE ou.user_id = $1
          ORDER BY p.id
        `,
        [session.user_id],
      );

      operatorPermissions = permissions.map(({ id }) => id);
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
     * @type {{ operator_permissions?: string[], sub: string }}
     */
    const claims = {
      sub: session.user_id,
    };

    if (operatorPermissions.length > 0) {
      claims.operator_permissions = operatorPermissions;
    }

    const access_token = await new SignJWT(claims)
      .setProtectedHeader({
        alg: "ES256",
        kid: ctx.security.signing.kid,
      })
      .setAudience(ctx.security.audience)
      .setIssuedAt(now)
      .setExpirationTime(now + TTL_SECONDS)
      .sign(ctx.security.signing.privateKey);

    return {
      access_token,
    };
  };
