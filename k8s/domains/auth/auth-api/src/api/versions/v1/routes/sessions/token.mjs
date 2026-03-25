import { importPKCS8, SignJWT } from "jose";
import nconf from "nconf";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  ErrorResponse,
  SessionTokenBody,
  SessionTokenResponse,
} from "../../schemas.mjs";

const privateKey = await importPKCS8(
  readFileSync(nconf.get("JWT_PRIVATE_KEY_PATH"), "utf8"),
  "ES256",
);

const TTL_SECONDS = 60;

const ALLOWED_AUDIENCES = new Set([
  "ai-inference",
  "auth",
  "billing",
  "profile",
  "uploads",
]);

const REUSE_WINDOW_MS = 10_000;
const MAX_CACHE = 10_000;

/**
 * @typedef {Object} ProjectionCacheEntry
 * @property {string} token
 * @property {number} exp   // unix ms timestamp when reuse window ends
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
 * @param {import('../../../../../fastify.js').FastifyInstance} fastify
 */
export default async function (fastify) {
  fastify.post(
    "/sessions/token",
    {
      schema: {
        body: SessionTokenBody,
        description:
          "Exchange a refresh token for a short-lived audience-scoped access token.",
        operationId: "exchangeSessionToken",
        response: {
          200: SessionTokenResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          500: ErrorResponse,
        },
        summary: "Mint access token",
        tags: ["sessions"],
      },
    },
    async function (req, reply) {
      const { pool } = this;

      const [type, token] = (req.headers.authorization || "").split(" ");

      if (type !== "Bearer" || !token) return reply.code(401).send(null);

      const { audience } = req.body;

      if (!ALLOWED_AUDIENCES.has(audience)) return reply.code(403).send(null);

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
        [createHash("sha256").update(token).digest()],
      );

      if (!session) return reply.code(401).send(null);

      const version = new Date(session.last_refreshed_at).toISOString();

      const cacheKey = `${session.id}:${version}:${audience}`;
      const cached = cache.get(cacheKey);

      if (cached && cached.exp > Date.now()) {
        reply.header("Cache-Control", "no-store");

        return reply.send({
          access_token: cached.token,
          expires_in: TTL_SECONDS,
        });
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
              kid: "k1",
              typ: "at+jwt",
            })
            .setIssuer(nconf.get("JWT_ISSUER"))
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

      reply.header("Cache-Control", "no-store");

      return reply.send({
        access_token: entry.token,
        expires_in: TTL_SECONDS,
      });
    },
  );
}
