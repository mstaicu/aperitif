import { server } from "@passwordless-id/webauthn";
import { Type } from "@sinclair/typebox";
import { importPKCS8, SignJWT } from "jose";
import nconf from "nconf";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";

const { hostname, origin } = new URL(nconf.get("ORIGIN"));

const ISSUER = "https://tma.com";
const ACCESS_TTL_SECONDS = 900;
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;
const JWT_KID = "k1";

const privateKeyPem = fs.readFileSync(
  nconf.get("JWT_PRIVATE_KEY_PATH"),
  "utf8",
);

const privateKey = await importPKCS8(privateKeyPem, "ES256");

const generateRefreshToken = () => {
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest();
  return { hash, token };
};

/**
 * @param {{
 *   userId: string,
 *   sessionId: string,
 *   aud: string[],
 *   scope?: string[]
 * }} p
 *
 * @returns {Promise<string>}
 */
const mintAccessToken = async (p) => {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + ACCESS_TTL_SECONDS;

  return new SignJWT({
    scope: p.scope ?? [],
    sid: p.sessionId,
  })
    .setProtectedHeader({ alg: "ES256", kid: JWT_KID, typ: "JWT" })
    .setIssuer(ISSUER)
    .setSubject(p.userId)
    .setAudience(p.aud)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .setJti(randomBytes(16).toString("base64url"))
    .sign(privateKey);
};

const Base64Url = Type.String({
  maxLength: 4096,
  minLength: 1,
  pattern: "^[A-Za-z0-9_-]+$",
});

const RegistrationFinalizeBody = Type.Object(
  {
    credential: Type.Object(
      {
        id: Base64Url,
        rawId: Base64Url,
        response: Type.Object({
          attestationObject: Base64Url,
          clientDataJSON: Base64Url,
        }),
        type: Type.Literal("public-key"),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

const AuthenticationFinalizeBody = Type.Object(
  {
    authentication: Type.Object(
      {
        id: Base64Url,
        rawId: Base64Url,
        response: Type.Object({
          authenticatorData: Base64Url,
          clientDataJSON: Base64Url,
          signature: Base64Url,
          userHandle: Type.Union([Base64Url, Type.Null()]),
        }),
        type: Type.Literal("public-key"),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

const RefreshBody = Type.Object(
  {
    refresh_token: Type.String({
      maxLength: 2048,
      minLength: 20,
    }),
  },
  { additionalProperties: false },
);

const RegistrationChallengeResponse = Type.Object({
  publicKey: Type.Any(),
});

const AuthenticationChallengeResponse = Type.Object({
  publicKey: Type.Any(),
});

const AuthSuccessResponse = Type.Object({
  refresh_token: Type.String(),
});

const RefreshResponse = Type.Object({
  access_token: Type.String(),
  refresh_token: Type.String(),
});

const EmptyResponse = Type.Null();
const ErrorResponse = Type.Null();

/**
 * @typedef {import("fastify").FastifyInstance<
 *   import("fastify").RawServerDefault,
 *   import("fastify").RawRequestDefaultExpression,
 *   import("fastify").RawReplyDefaultExpression,
 *   import("fastify").FastifyBaseLogger,
 *   import("@fastify/type-provider-typebox").TypeBoxTypeProvider
 * >} TypeBoxFastify
 */

/**
 * @param {TypeBoxFastify} fastify
 * @param {{ pool: import("pg").Pool }} opts
 */
export const routes = async (fastify, opts) => {
  const { pool } = opts;

  fastify.post(
    "/webauthn/registration/challenge",
    {
      schema: {
        response: {
          200: RegistrationChallengeResponse,
        },
      },
    },
    async (_, reply) => {
      const userId = randomUUID();

      const {
        rows: [challenge],
      } = await pool.query(
        `
          INSERT INTO webauthn_challenges (user_id)
          VALUES ($1)
          RETURNING value
        `,
        [userId],
      );

      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      reply.header("Content-Type", "application/json");

      return reply.code(200).send({
        publicKey: {
          attestation: "none",
          authenticatorSelection: {
            residentKey: "required",
            userVerification: "required",
          },
          challenge: challenge.value.toString("base64url"),
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },
            { alg: -8, type: "public-key" },
            { alg: -257, type: "public-key" },
          ],
          rp: { id: hostname, name: hostname },
          user: {
            displayName: userId,
            id: Buffer.from(userId).toString("base64url"),
            name: userId,
          },
        },
      });
    },
  );

  fastify.post(
    "/webauthn/registration",
    {
      schema: {
        body: RegistrationFinalizeBody,
        response: {
          201: EmptyResponse,
          400: ErrorResponse,
          409: ErrorResponse,
          500: ErrorResponse,
        },
      },
    },
    async function (request, reply) {
      /** @type {any} */
      const { credential } = request.body;

      let clientData;

      try {
        clientData = JSON.parse(
          Buffer.from(credential.response.clientDataJSON, "base64url").toString(
            "utf8",
          ),
        );
      } catch {
        return reply.code(400).send(null);
      }

      if (clientData?.type !== "webauthn.create")
        return reply.code(400).send(null);

      let challengeBytes;

      try {
        challengeBytes = Buffer.from(clientData.challenge, "base64url");
      } catch {
        return reply.code(400).send(null);
      }

      const {
        rows: [challenge],
      } = await pool.query(
        `
            DELETE FROM webauthn_challenges
            WHERE value = $1
              AND expires_at > NOW()
            RETURNING user_id, value
          `,
        [challengeBytes],
      );

      if (!challenge) return reply.code(400).send(null);

      const userId = challenge.user_id;
      const expectedChallenge = Buffer.from(challenge.value).toString(
        "base64url",
      );

      let result;

      try {
        result = await server.verifyRegistration(credential, {
          challenge: expectedChallenge,
          origin,
          // @ts-ignore
          rpId: hostname,
        });
      } catch {
        return reply.code(400).send(null);
      }

      if (!result?.credential || !result.userVerified) {
        return reply.code(400).send(null);
      }

      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL lock_timeout = '75ms'");
        await client.query("SET LOCAL statement_timeout = '1s'");

        await client.query(
          `INSERT INTO users (id) VALUES ($1) ON CONFLICT DO NOTHING`,
          [userId],
        );

        await client.query(
          `SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))`,
          [userId],
        );

        const { rowCount } = await client.query(
          `
            WITH next_index AS (
              SELECT s
              FROM generate_series(1, 5) AS s
              WHERE NOT EXISTS (
                SELECT 1
                FROM webauthn_credentials
                WHERE user_id = $1
                  AND credential_index = s
              )
              ORDER BY s
              LIMIT 1
            )
            INSERT INTO webauthn_credentials
            (
              user_id,
              credential_index,
              credential_id,
              public_key,
              algorithm,
              transports,
              sign_count
            )
            SELECT
              $1,
              s,
              $2,
              $3,
              $4,
              $5,
              $6
            FROM next_index
            RETURNING id
          `,
          [
            userId,
            Buffer.from(result.credential.id, "base64url"),
            Buffer.from(result.credential.publicKey, "base64url"),
            result.credential.algorithm,
            result.credential.transports,
            result.authenticator.counter,
          ],
        );

        // If no slot available → user already has 5
        if (rowCount === 0) {
          await client.query("ROLLBACK");
          return reply.code(409).send(null);
        }

        await client.query("COMMIT");
        return reply.code(201).send(null);

        // TODO: Send refresh token here?
      } catch (err) {
        await client.query("ROLLBACK");

        /** @type {any} */ const error = err;

        if (error.code === "23505") return reply.code(409).send(null);

        return reply.code(500).send(null);
      } finally {
        client.release();
      }
    },
  );

  fastify.post(
    "/webauthn/authentication/challenge",
    { schema: { response: { 200: AuthenticationChallengeResponse } } },
    async (_, reply) => {
      const {
        rows: [challenge],
      } = await pool.query(
        `
          INSERT INTO webauthn_challenges (user_id)
          VALUES (NULL)
          RETURNING value
        `,
      );

      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      reply.header("Content-Type", "application/json");

      return reply.code(200).send({
        publicKey: {
          challenge: challenge.value.toString("base64url"),
          rpId: hostname,
          userVerification: "required",
        },
      });
    },
  );

  fastify.post(
    "/webauthn/authentication",
    {
      schema: {
        body: AuthenticationFinalizeBody,
        response: {
          200: AuthSuccessResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          500: ErrorResponse,
          503: ErrorResponse,
        },
      },
    },
    async function (request, reply) {
      /** @type {any} */
      const { authentication } = request.body;

      let clientData;

      try {
        clientData = JSON.parse(
          Buffer.from(
            authentication.response.clientDataJSON,
            "base64url",
          ).toString("utf8"),
        );
      } catch {
        return reply.code(401).send(null);
      }

      if (clientData?.type !== "webauthn.get")
        return reply.code(401).send(null);

      let challengeBytes;

      try {
        challengeBytes = Buffer.from(clientData.challenge, "base64url");
      } catch {
        return reply.code(400).send(null);
      }

      const {
        rows: [challenge],
      } = await pool.query(
        `
            DELETE FROM webauthn_challenges
            WHERE value = $1
              AND expires_at > NOW()
            RETURNING user_id, value
          `,
        [challengeBytes],
      );

      if (!challenge) return reply.code(400).send(null);

      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL lock_timeout = '75ms'");
        await client.query("SET LOCAL statement_timeout = '1s'");

        const credentialId = Buffer.from(authentication.id, "base64url");

        const {
          rows: [credential],
        } = await client.query(
          `
            SELECT user_id, credential_id, public_key, algorithm,
              transports, sign_count
            FROM webauthn_credentials
            WHERE credential_id = $1
            FOR UPDATE
          `,
          [credentialId],
        );

        if (!credential) {
          await client.query("ROLLBACK");
          return reply.code(401).send(null);
        }

        const expectedChallenge = Buffer.from(challenge.value).toString(
          "base64url",
        );

        const expected = {
          challenge: expectedChallenge,
          counter: Number(credential.sign_count),
          origin,
          rpId: hostname,
          userVerified: true,
        };

        const expectedCredential = {
          algorithm: credential.algorithm,
          id: Buffer.from(credential.credential_id).toString("base64url"),
          publicKey: Buffer.from(credential.public_key).toString("base64url"),
          transports: credential.transports ?? [],
        };

        let result;

        try {
          result = await server.verifyAuthentication(
            authentication,
            expectedCredential,
            expected,
          );
        } catch {
          await client.query("ROLLBACK");
          return reply.code(401).send(null);
        }

        if (!result.userVerified) {
          await client.query("ROLLBACK");
          return reply.code(401).send(null);
        }

        const oldCounter = Number(credential.sign_count);
        const newCounter = result.counter;

        // Monotonic counter enforcement
        if (
          (oldCounter > 0 && newCounter === 0) ||
          (newCounter > 0 && newCounter <= oldCounter)
        ) {
          await client.query("ROLLBACK");
          return reply.code(401).send(null);
        }

        if (newCounter > oldCounter) {
          const { rowCount } = await client.query(
            `
              UPDATE webauthn_credentials
              SET sign_count = $2
              WHERE credential_id = $1
                AND sign_count < $2
            `,
            [credential.credential_id, newCounter],
          );

          if (rowCount === 0) {
            await client.query("ROLLBACK");
            return reply.code(401).send(null);
          }
        }

        const { hash: refreshHash, token: refreshToken } =
          generateRefreshToken();

        await client.query(
          `
            INSERT INTO sessions
              (user_id, refresh_token_hash, refresh_expires_at)
            VALUES
              ($1, $2, NOW() + ($3::int * INTERVAL '1 second'))
            RETURNING id, user_id
          `,
          [credential.user_id, refreshHash, REFRESH_TTL_SECONDS],
        );

        await client.query("COMMIT");

        reply.header("Cache-Control", "no-store");
        reply.header("Pragma", "no-cache");

        reply.header("Content-Type", "application/json");

        return reply.code(200).send({ refresh_token: refreshToken });
      } catch (err) {
        await client.query("ROLLBACK");

        /** @type {any} */ const e = err;

        if (["55P03", "57014"].includes(e?.code))
          return reply.code(503).send(null);

        return reply.code(500).send(null);
      } finally {
        client.release();
      }
    },
  );

  fastify.post(
    "/auth/refresh",
    {
      schema: {
        body: RefreshBody,
        response: {
          200: RefreshResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          500: ErrorResponse,
          503: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { refresh_token } = request.body;

      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL lock_timeout = '75ms'");
        await client.query("SET LOCAL statement_timeout = '1s'");

        const oldHash = createHash("sha256").update(refresh_token).digest();

        const { hash: newHash, token: newRefresh } = generateRefreshToken();

        const {
          rows: [session],
        } = await client.query(
          `
            UPDATE sessions
            SET
              refresh_token_hash = $2,
              refresh_expires_at = NOW() + ($3::int * INTERVAL '1 second')
            WHERE
              refresh_token_hash = $1
              AND revoked_at IS NULL
              AND refresh_expires_at > NOW()
            RETURNING id, user_id
          `,
          [oldHash, newHash, REFRESH_TTL_SECONDS],
        );

        if (!session) {
          await client.query("ROLLBACK");
          return reply.code(401).send(null);
        }

        const accessToken = await mintAccessToken({
          aud: ["auth"],
          scope: [],
          sessionId: session.id,
          userId: session.user_id,
        });

        await client.query("COMMIT");

        reply.header("Cache-Control", "no-store");
        reply.header("Pragma", "no-cache");

        reply.header("Content-Type", "application/json");

        return reply.code(200).send({
          access_token: accessToken,
          refresh_token: newRefresh,
        });
      } catch (err) {
        await client.query("ROLLBACK");

        /** @type {any} */ const e = err;
        if (e?.code === "57014" || e?.code === "55P03")
          return reply.code(503).send(null);

        return reply.code(500).send(null);
      } finally {
        client.release();
      }
    },
  );
};
