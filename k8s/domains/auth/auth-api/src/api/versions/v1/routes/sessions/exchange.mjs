import { importPKCS8, SignJWT } from "jose";
import nconf from "nconf";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { EmptyResponse, ErrorResponse, ExchangeBody } from "../../schemas.mjs";

const privateKey = await importPKCS8(
  readFileSync(nconf.get("JWT_PRIVATE_KEY_PATH"), "utf8"),
  "ES256",
);

const ALLOWED = new Map([["auth", "auth"]]);

const ACCESS_TOKEN_TTL_S = 60;
const CACHE_TTL_MS = 10_000;
const MAX_CACHE_SIZE = 10_000;

/**
 * Small bounded cache. Evict oldest entry when full.
 * @param {Map<string, { exp: number, token: string }>} cache
 * @param {string} key
 * @param {{ exp: number, token: string }} value
 */
function cacheSet(cache, key, value) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }

  cache.set(key, value);
}

/**
 * @param {string | undefined} v
 * @returns {string | undefined}
 */
function extractBearer(v) {
  if (!v) return;

  const parts = v.split(" ");
  if (parts.length !== 2) return;
  if (parts[0] !== "Bearer") return;

  return parts[1];
}

/**
 * @param {string} sub
 * @param {string} audience
 */
async function mintAccessToken(sub, audience) {
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({ sub })
    .setProtectedHeader({
      alg: "ES256",
      kid: "k1",
      typ: "JWT",
    })
    .setIssuedAt(now)
    .setIssuer(nconf.get("JWT_ISSUER"))
    .setAudience(audience)
    .setExpirationTime(now + ACCESS_TOKEN_TTL_S)
    .sign(privateKey);
}

/**
 * @param {import('../../../../../fastify.js').FastifyInstance} fastify
 */
export default async function (fastify) {
  /** @type {Map<string, { exp: number, token: string }>} */
  const cache = new Map();

  /** @type {Map<string, Promise<{ exp: number, token: string }>>} */
  const inflight = new Map();

  fastify.post(
    "/exchange",
    {
      schema: {
        body: ExchangeBody,
        hide: true,
        response: {
          200: EmptyResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          500: ErrorResponse,
        },
      },
    },
    async function (request, reply) {
      const { pool } = this;

      /**
       * Audience
       */
      const raw = request.headers["x-forwarded-uri"];
      const uri = Array.isArray(raw) ? raw[0] : raw;

      if (typeof uri !== "string") return reply.code(403).send(null);

      const segment = uri.split("/")[uri.startsWith("/") ? 0 : 1];

      const audience = ALLOWED.get(segment);

      if (!audience) return reply.code(403).send(null);

      /**
       * Refresh token bearer
       */
      const refresh = extractBearer(request.headers.authorization);

      if (!refresh || typeof refresh !== "string")
        return reply.code(401).send(null);

      const {
        rows: [session],
      } = await pool.query(
        `
          SELECT id, user_id, last_refreshed_at
          FROM sessions
          WHERE refresh_token_hash = $1
            AND revoked_at IS NULL
            AND expires_at > NOW()
        `,
        [createHash("sha256").update(refresh).digest()],
      );

      if (!session) return reply.code(401).send(null);

      // Cache correctness is now derived from DB-validated session state.
      // When refresh rotates, last_refreshed_at changes and the cache key changes too.
      const version = session.last_refreshed_at
        ? new Date(session.last_refreshed_at).toISOString()
        : "initial";

      const cacheKey = `${session.id}:${version}:${audience}`;
      const now = Date.now();

      const cached = cache.get(cacheKey);

      if (cached && cached.exp > now) {
        reply.header("Authorization", `Bearer ${cached.token}`);
        return reply.code(200).send(null);
      }

      let pending = inflight.get(cacheKey);

      if (!pending) {
        pending = mintAccessToken(session.user_id, audience)
          .then((token) => {
            const entry = {
              exp: Date.now() + CACHE_TTL_MS,
              token,
            };

            cacheSet(cache, cacheKey, entry);
            return entry;
          })
          .finally(() => {
            inflight.delete(cacheKey);
          });

        inflight.set(cacheKey, pending);
      }

      const entry = await pending;

      reply.header("Authorization", `Bearer ${entry.token}`);
      return reply.code(200).send(null);
    },
  );
}
