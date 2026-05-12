import { SignJWT } from "jose";
import { createHash } from "node:crypto";

import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

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

    let session;

    try {
      ({
        rows: [session],
      } = await ctx.persistence.db.query(
        `
          SELECT user_id
          FROM sessions
          WHERE refresh_token_hash = $1
            AND revoked_at IS NULL
            AND expires_at > NOW()
        `,
        [createHash("sha256").update(refresh_token).digest()],
      ));
    } catch (err) {
      if (isDatabaseUnavailable(err)) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    }

    if (!session) {
      throw new Error("SESSION_NOT_FOUND");
    }

    const now = Math.floor(Date.now() / 1000);
    /**
     * @type {{ platform_roles?: string[], sub: string }}
     */
    const claims = {
      sub: session.user_id,
    };

    if (ctx.security.platformOperatorUserIds.has(session.user_id)) {
      claims.platform_roles = ["operator"];
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
