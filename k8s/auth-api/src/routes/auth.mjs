// @ts-check
import { server } from "@passwordless-id/webauthn";
import { importPKCS8, SignJWT } from "jose";
import nconf from "nconf";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";

var { hostname, origin } = new URL(nconf.get("ORIGIN"));

var ISSUER = nconf.get("JWT_ISSUER") || "https://tma.com";
var ACCESS_TTL_SECONDS = Number(nconf.get("ACCESS_TTL_SECONDS") || 900); // 15m
var REFRESH_TTL_SECONDS = Number(
  nconf.get("REFRESH_TTL_SECONDS") || 30 * 24 * 60 * 60, // 30d
);
var JWT_KID = nconf.get("JWT_KID") || "k1";

var privateKeyPem = fs.readFileSync(nconf.get("JWT_PRIVATE_KEY_PATH"), "utf8");
var privateKey = await importPKCS8(privateKeyPem, "ES256");

function generateRefreshToken() {
  var token = randomBytes(32).toString("base64url");
  var hash = createHash("sha256").update(token).digest();
  return { hash, token };
}

/**
 *
 * @param {any} p
 * @returns
 */
async function mintAccessToken(p) {
  var now = Math.floor(Date.now() / 1000);
  var exp = now + ACCESS_TTL_SECONDS;

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
}

var Base64Url = {
  maxLength: 4096,
  minLength: 1,
  pattern: "^[A-Za-z0-9_-]+$",
  type: "string",
};

var RegistrationFinalizeBody = {
  additionalProperties: false,
  properties: {
    credential: {
      additionalProperties: false,
      properties: {
        id: Base64Url,
        rawId: Base64Url,
        response: {
          additionalProperties: false,
          properties: {
            attestationObject: Base64Url,
            clientDataJSON: Base64Url,
          },
          required: ["clientDataJSON", "attestationObject"],
          type: "object",
        },
        type: { const: "public-key" },
      },
      required: ["id", "rawId", "type", "response"],
      type: "object",
    },
  },
  required: ["credential"],
  type: "object",
};

var AuthenticationFinalizeBody = {
  additionalProperties: false,
  properties: {
    authentication: {
      additionalProperties: false,
      properties: {
        id: Base64Url,
        rawId: Base64Url,
        response: {
          additionalProperties: false,
          properties: {
            authenticatorData: Base64Url,
            clientDataJSON: Base64Url,
            signature: Base64Url,
            userHandle: {
              anyOf: [Base64Url, { type: "null" }],
            },
          },
          required: ["clientDataJSON", "authenticatorData", "signature"],
          type: "object",
        },
        type: { const: "public-key" },
      },
      required: ["id", "rawId", "type", "response"],
      type: "object",
    },
  },
  required: ["authentication"],
  type: "object",
};

var RefreshBody = {
  additionalProperties: false,
  properties: {
    aud: {
      items: { maxLength: 64, minLength: 1, type: "string" },
      maxItems: 8,
      minItems: 1,
      type: "array",
    },
    refresh_token: { maxLength: 2048, minLength: 20, type: "string" },
  },
  required: ["refresh_token", "aud"],
  type: "object",
};

var RegistrationChallengeResponse = {
  additionalProperties: false,
  properties: {
    publicKey: {
      additionalProperties: true,
      properties: {
        challenge: Base64Url,
      },
      required: ["challenge"],
      type: "object",
    },
  },
  required: ["publicKey"],
  type: "object",
};

var AuthenticationChallengeResponse = {
  additionalProperties: false,
  properties: {
    publicKey: {
      additionalProperties: true,
      properties: {
        challenge: Base64Url,
      },
      required: ["challenge"],
      type: "object",
    },
  },
  required: ["publicKey"],
  type: "object",
};

var AuthSuccessResponse = {
  additionalProperties: false,
  properties: {
    refresh_token: { type: "string" },
  },
  required: ["refresh_token"],
  type: "object",
};

var RefreshResponse = {
  additionalProperties: false,
  properties: {
    access_token: { type: "string" },
    refresh_token: { type: "string" },
  },
  required: ["access_token", "refresh_token"],
  type: "object",
};

var EmptyResponse = { type: "null" };
var ErrorResponse = { type: "null" };

/**
 * @param {import("fastify").FastifyInstance} fastify
 * @param {{ pool: import("pg").Pool }} opts
 */
export var routes = async (fastify, opts) => {
  var { pool } = opts;

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
      var userId = randomUUID();

      var {
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
      var { credential } = request.body;

      var clientData;

      try {
        clientData = JSON.parse(
          Buffer.from(credential.response.clientDataJSON, "base64url").toString(
            "utf8",
          ),
        );
      } catch {
        return reply.code(400).send();
      }

      var challengeBytes = Buffer.from(clientData.challenge, "base64url");

      var {
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

      if (!challenge) {
        return reply.code(400).send();
      }

      var userId = challenge.user_id;
      var expectedChallenge = Buffer.from(challenge.value).toString(
        "base64url",
      );

      var result;

      try {
        result = await server.verifyRegistration(credential, {
          challenge: expectedChallenge,
          origin,
          // @ts-ignore
          rpId: hostname,
        });
      } catch {
        return reply.code(400).send();
      }

      if (!result?.credential || !result.userVerified) {
        return reply.code(400).send();
      }

      var client = await pool.connect();

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

        var { rowCount } = await client.query(
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
          return reply.code(409).send();
        }

        await client.query("COMMIT");
        return reply.code(201).send();
      } catch (err) {
        await client.query("ROLLBACK");

        /** @type {any} */ var error = err;

        if (error.code === "23505") return reply.code(409).send();

        return reply.code(500).send();
      } finally {
        client.release();
      }
    },
  );

  fastify.post(
    "/webauthn/authentication/challenge",
    { schema: { response: { 200: AuthenticationChallengeResponse } } },
    async (_, reply) => {
      var {
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
          401: ErrorResponse,
          500: ErrorResponse,
          503: ErrorResponse,
        },
      },
    },
    async function (request, reply) {
      /** @type {any} */
      var { authentication } = request.body;

      let clientData;

      try {
        clientData = JSON.parse(
          Buffer.from(
            authentication.response.clientDataJSON,
            "base64url",
          ).toString("utf8"),
        );
      } catch {
        return reply.code(401).send();
      }

      var challengeBytes = Buffer.from(clientData.challenge, "base64url");

      var {
        rows: [challenge],
      } = await pool.query(
        `
          DELETE FROM webauthn_challenges
          WHERE value = $1
            AND expires_at > NOW()
          RETURNING value
        `,
        [challengeBytes],
      );

      if (!challenge) return reply.code(401).send();

      var client = await pool.connect();

      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL lock_timeout = '75ms'");
        await client.query("SET LOCAL statement_timeout = '1s'");

        var credentialId = Buffer.from(authentication.id, "base64url");

        var {
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
          return reply.code(401).send();
        }

        var expectedChallenge = Buffer.from(challenge.value).toString(
          "base64url",
        );

        var expected = {
          challenge: expectedChallenge,
          counter: Number(credential.sign_count),
          origin,
          rpId: hostname,
          userVerified: true,
        };

        var expectedCredential = {
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
          return reply.code(401).send();
        }

        if (!result.userVerified) {
          await client.query("ROLLBACK");
          return reply.code(401).send();
        }

        var oldCounter = Number(credential.sign_count);
        var newCounter = result.counter;

        // Monotonic counter enforcement (bank-grade invariant)
        if (
          (oldCounter > 0 && newCounter === 0) ||
          (newCounter > 0 && newCounter <= oldCounter)
        ) {
          await client.query("ROLLBACK");
          return reply.code(401).send();
        }

        if (newCounter > oldCounter) {
          var { rowCount } = await client.query(
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
            return reply.code(401).send();
          }
        }

        var {
          rows: [session],
        } = await client.query(
          `
            INSERT INTO sessions (user_id)
            VALUES ($1)
            RETURNING id
          `,
          [credential.user_id],
        );

        var { hash: refreshHash, token: refreshToken } = generateRefreshToken();

        await client.query(
          `
            INSERT INTO refresh_tokens (session_id, token_hash, expires_at)
            VALUES ($1, $2, NOW() + ($3::int * INTERVAL '1 second'))
          `,
          [session.id, refreshHash, REFRESH_TTL_SECONDS],
        );

        await client.query("COMMIT");

        return reply.code(200).send({
          refresh_token: refreshToken,
        });
      } catch (err) {
        await client.query("ROLLBACK");

        /** @type {any} */ var e = err;

        if (["55P03", "57014"].includes(e?.code)) return reply.code(503).send();

        return reply.code(500).send();
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
      var { aud, refresh_token } = request.body;

      var client = await pool.connect();

      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL lock_timeout = '75ms'");
        await client.query("SET LOCAL statement_timeout = '1s'");

        var tokenHash = createHash("sha256").update(refresh_token).digest();

        var {
          rows: [row],
        } = await client.query(
          `
            SELECT
              rt.id          AS token_id,
              rt.session_id  AS session_id,
              rt.revoked_at  AS token_revoked_at,
              rt.expires_at  AS token_expires_at,
              s.user_id      AS user_id,
              s.revoked_at   AS session_revoked_at
            FROM refresh_tokens rt
            JOIN sessions s
              ON s.id = rt.session_id
            WHERE rt.token_hash = $1
            FOR UPDATE
          `,
          [tokenHash],
        );

        if (!row || row.session_revoked_at) {
          await client.query("ROLLBACK");
          return reply.code(401).send();
        }

        if (new Date(row.token_expires_at).getTime() <= Date.now()) {
          await client.query("ROLLBACK");
          return reply.code(401).send();
        }

        // Reuse detection: token already revoked but presented again => revoke the session
        if (row.token_revoked_at) {
          await client.query(
            `
              UPDATE sessions 
              SET revoked_at = NOW() 
              WHERE id = $1 
                AND revoked_at IS NULL`,
            [row.session_id],
          );

          await client.query("COMMIT");
          return reply.code(401).send();
        }

        // Rotation: revoke current refresh
        await client.query(
          `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
          [row.token_id],
        );

        // Issue next refresh token
        var { hash: nextHash, token: nextRefresh } = generateRefreshToken();

        await client.query(
          `
            INSERT INTO refresh_tokens (session_id, token_hash, expires_at)
            VALUES ($1, $2, NOW() + ($3::int * INTERVAL '1 second'))
          `,
          [row.session_id, nextHash, REFRESH_TTL_SECONDS],
        );

        // TODO: Check if user can access the requested aud domain

        var accessToken = await mintAccessToken({
          aud,
          scope: [],
          sessionId: row.session_id,
          userId: row.user_id,
        });

        await client.query("COMMIT");

        return reply.code(200).send({
          access_token: accessToken,
          refresh_token: nextRefresh,
        });
      } catch (err) {
        await client.query("ROLLBACK");

        /** @type {any} */ var e = err;
        if (e?.code === "57014" || e?.code === "55P03")
          return reply.code(503).send();

        return reply.code(500).send();
      } finally {
        client.release();
      }
    },
  );
};
