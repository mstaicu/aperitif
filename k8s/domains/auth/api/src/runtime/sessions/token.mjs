import { SignJWT } from "jose";
import { createHash } from "node:crypto";

const TTL_SECONDS = 60;

/**
 * @param {import("../../context.mjs").Context} ctx
 * @returns {(args: { refresh_token: string; audience: string }) => Promise<{ access_token: string }>}
 */
export const createAccessToken =
  (ctx) =>
  async ({ audience, refresh_token }) => {
    if (!refresh_token || typeof refresh_token !== "string") {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    const {
      rows: [session],
    } = await ctx.data.db.query(
      `
        SELECT user_id
        FROM sessions
        WHERE refresh_token_hash = $1
          AND revoked_at IS NULL
          AND expires_at > NOW()
      `,
      [createHash("sha256").update(refresh_token).digest()],
    );

    if (!session) {
      throw new Error("SESSION_NOT_FOUND");
    }

    const now = Math.floor(Date.now() / 1000);
    const access_token = await new SignJWT({
      sub: session.user_id,
    })
      .setProtectedHeader({
        alg: "ES256",
        kid: ctx.tokens.signing.kid,
      })
      .setAudience(audience)
      .setIssuedAt(now)
      .setExpirationTime(now + TTL_SECONDS)
      .sign(ctx.tokens.signing.privateKey);

    return {
      access_token,
    };
  };
