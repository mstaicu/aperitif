import { importPKCS8, SignJWT } from "jose";
import nconf from "nconf";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { EmptyResponse, ErrorResponse, ExchangeBody } from "../../schemas.mjs";

const privateKeyPem = readFileSync(nconf.get("JWT_PRIVATE_KEY_PATH"), "utf8");
const privateKey = await importPKCS8(privateKeyPem, "ES256");

const ALLOWED = new Map([["auth", "auth"]]);

/**
 *
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
 * @param {import('../../../../../fastify.js').FastifyInstance} fastify
 */
export default async function (fastify) {
  const cache = new Map();
  const inflight = new Map();

  fastify.post(
    "/exchange",
    {
      schema: {
        body: ExchangeBody,
        description:
          "Gateway-facing endpoint that exchanges a valid refresh session for a short-lived audience-scoped access token.",
        operationId: "exchangeSessionToken",
        response: {
          200: EmptyResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          500: ErrorResponse,
        },
        summary: "Exchange refresh token for access token",
        tags: ["sessions"],
      },
    },
    async function (request, reply) {
      const { pool } = this;

      const raw = request.headers["x-forwarded-uri"];

      const uri = Array.isArray(raw) ? raw[0] : raw;

      if (typeof uri !== "string") {
        return reply.code(403).send(null);
      }

      const segment = uri.startsWith("/")
        ? uri.slice(1).split("/", 1)[0]
        : uri.split("/", 1)[0];

      const audience = ALLOWED.get(segment);

      if (!audience) {
        return reply.code(403).send(null);
      }

      const refresh =
        request.headers["x-session-token"] ??
        extractBearer(request.headers.authorization);

      if (!refresh || typeof refresh !== "string") {
        return reply.code(401).send(null);
      }

      const {
        rows: [session],
      } = await pool.query(
        `
          SELECT id, user_id
          FROM sessions
          WHERE refresh_token_hash = $1
            AND revoked_at IS NULL
            AND expires_at > NOW()
        `,
        [createHash("sha256").update(refresh).digest()],
      );

      if (!session) return reply.code(401).send(null);

      const cacheKey = `${session.id}:${audience}`;
      const cached = cache.get(cacheKey);

      if (cached && cached.exp > Date.now()) {
        reply.header("Authorization", `Bearer ${cached.token}`);
        return reply.code(200).send(null);
      }

      if (inflight.has(cacheKey)) {
        const entry = await inflight.get(cacheKey);
        reply.header("Authorization", `Bearer ${entry.token}`);
        return reply.code(200).send(null);
      }

      const p = (async () => {
        const now = Math.floor(Date.now() / 1000);

        const token = await new SignJWT({
          sub: session.user_id,
        })
          .setProtectedHeader({
            alg: "ES256",
            kid: "k1",
            typ: "JWT",
          })
          .setIssuedAt(now)
          .setIssuer(nconf.get("JWT_ISSUER"))
          .setAudience(audience)
          .setExpirationTime(now + 60)
          .sign(privateKey);

        const entry = {
          exp: Date.now() + 10_000,
          token,
        };

        cache.set(cacheKey, entry);

        return entry;
      })().finally(() => inflight.delete(cacheKey));

      inflight.set(cacheKey, p);

      const entry = await p;

      reply.header("Authorization", `Bearer ${entry.token}`);
      return reply.code(200).send(null);
    },
  );
}
