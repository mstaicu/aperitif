import { SignJWT } from "jose";
import { createHash } from "node:crypto";

const TTL_SECONDS = 60;
const REUSE_WINDOW_MS = 10_000;
const MAX_CACHE = 10_000;

const ALLOWED_AUDIENCES = new Set([
  "ai-inference",
  "auth",
  "billing",
  "profile",
  "uploads",
]);

/**
 * @typedef {Object} ProjectionCacheEntry
 * @property {string} token
 * @property {number} exp
 */

/** @type {Map<string, ProjectionCacheEntry>} */
const cache = new Map();
/** @type {Map<string, Promise<ProjectionCacheEntry>>} */
const inflight = new Map();

/**
 * @param {string} key
 * @param {ProjectionCacheEntry} value
 */
function cacheSet(key, value) {
  if (cache.size >= MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }

  cache.set(key, value);
}

/**
 * @param {import("../../context.mjs").Context} ctx
 * @returns {(args: { refresh_token: string; audience: string }) => Promise<{ access_token: string; expires_in: number }>}
 */
export const createAccessToken = (ctx) => {
  const privateKey = ctx.jwt.privateKey;

  return async ({ audience, refresh_token }) => {
    if (!refresh_token || typeof refresh_token !== "string") {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    if (!ALLOWED_AUDIENCES.has(audience)) {
      throw new Error("INVALID_AUDIENCE");
    }

    const {
      rows: [session],
    } = await ctx.db.query(
      `
        SELECT id, user_id, last_refreshed_at
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

    const version = new Date(session.last_refreshed_at).toISOString();
    const cacheKey = `${session.id}:${version}:${audience}`;
    const cached = cache.get(cacheKey);

    if (cached && cached.exp > Date.now()) {
      return {
        access_token: cached.token,
        expires_in: TTL_SECONDS,
      };
    }

    let pending = inflight.get(cacheKey);

    if (!pending) {
      pending = (async () => {
        const now = Math.floor(Date.now() / 1000);

        const token = await new SignJWT({
          sub: session.user_id,
        })
          .setProtectedHeader({
            alg: "ES256",
            kid: ctx.jwt.kid,
          })
          .setIssuer(ctx.jwt.issuer)
          .setAudience(audience)
          .setIssuedAt(now)
          .setExpirationTime(now + TTL_SECONDS)
          .sign(privateKey);

        const entry = {
          exp: Date.now() + REUSE_WINDOW_MS,
          token,
        };

        cacheSet(cacheKey, entry);

        return entry;
      })().finally(() => {
        inflight.delete(cacheKey);
      });

      inflight.set(cacheKey, pending);
    }

    const entry = await pending;

    return {
      access_token: entry.token,
      expires_in: TTL_SECONDS,
    };
  };
};
