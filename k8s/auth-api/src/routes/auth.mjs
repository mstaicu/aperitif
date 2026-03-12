import {
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
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

// Base64url sometimes comes padded from non-browser clients.
// Accept unpadded + optional "==" padding.
const Base64Url = Type.String({
  maxLength: 8192,
  minLength: 1,
  pattern: "^[A-Za-z0-9_-]+={0,2}$",
});

const EmptyResponse = Type.Null();
const ErrorResponse = Type.Null();

const AuthenticatorAttachment = Type.Union([
  Type.Literal("platform"),
  Type.Literal("cross-platform"),
]);

const UserVerificationRequirement = Type.Union([
  Type.Literal("required"),
  Type.Literal("preferred"),
  Type.Literal("discouraged"),
]);

const ClientExtensionResults = Type.Record(Type.String(), Type.Any());

const RegistrationResponseJSON = Type.Object(
  {
    authenticatorAttachment: Type.Optional(AuthenticatorAttachment),
    clientExtensionResults: Type.Optional(ClientExtensionResults),
    id: Base64Url,

    rawId: Base64Url,

    response: Type.Object(
      {
        attestationObject: Base64Url,
        clientDataJSON: Base64Url,
      },
      { additionalProperties: true },
    ),
    type: Type.Literal("public-key"),
  },
  { additionalProperties: false },
);

const AuthenticationResponseJSON = Type.Object(
  {
    authenticatorAttachment: Type.Optional(AuthenticatorAttachment),
    clientExtensionResults: Type.Optional(ClientExtensionResults),
    id: Base64Url,

    rawId: Base64Url,

    response: Type.Object(
      {
        authenticatorData: Base64Url,
        clientDataJSON: Base64Url,
        signature: Base64Url,
        userHandle: Type.Optional(Base64Url),
      },
      { additionalProperties: true },
    ),
    type: Type.Literal("public-key"),
  },
  { additionalProperties: false },
);

const RegistrationFinalizeBody = Type.Object(
  { credential: RegistrationResponseJSON },
  { additionalProperties: false },
);

const AuthenticationFinalizeBody = Type.Object(
  { authentication: AuthenticationResponseJSON },
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
  publicKey: Type.Object(
    {
      attestation: Type.String(),

      authenticatorSelection: Type.Object({
        residentKey: Type.String(),
        userVerification: UserVerificationRequirement,
      }),

      challenge: Base64Url,

      pubKeyCredParams: Type.Array(
        Type.Object({
          alg: Type.Integer(),
          type: Type.Literal("public-key"),
        }),
      ),

      rp: Type.Object({
        id: Type.String(),
        name: Type.String(),
      }),
      timeout: Type.Optional(Type.Integer({ minimum: 1 })),
      user: Type.Object({
        displayName: Type.String(),
        id: Base64Url,
        name: Type.String(),
      }),
    },
    { additionalProperties: true },
  ),
});

const AuthenticationChallengeResponse = Type.Object({
  publicKey: Type.Object(
    {
      challenge: Base64Url,
      rpId: Type.String(),
      timeout: Type.Optional(Type.Integer({ minimum: 1 })),
      userVerification: UserVerificationRequirement,
    },
    { additionalProperties: true },
  ),
});

const AuthSuccessResponse = Type.Object({
  refresh_token: Type.String(),
});

const RefreshResponse = Type.Object({
  access_token: Type.String(),
  refresh_token: Type.String(),
});

/**
 * @param {import('../fastify.js').Instance} fastify
 */
export const routes = async (fastify) => {
  const { pool } = fastify;

  fastify.post(
    "/auth/webauthn/registration/challenge",
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
          timeout: 60000,
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
    "/auth/webauthn/registration",
    {
      schema: {
        body: RegistrationFinalizeBody,
        response: {
          201: EmptyResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          409: ErrorResponse,
          500: ErrorResponse,
          503: ErrorResponse,
        },
      },
    },
    async function (request, reply) {
      const { credential } = request.body;

      // WebAuthn invariant: `id` and `rawId` must represent the same bytes.
      // Many libs set them equal (same base64url string). Reject mismatches early.
      let idBytes;
      let rawIdBytes;

      try {
        idBytes = Buffer.from(credential.id, "base64url");
        rawIdBytes = Buffer.from(credential.rawId, "base64url");
      } catch {
        return reply.code(400).send(null);
      }

      if (!idBytes.equals(rawIdBytes)) return reply.code(400).send(null);

      let clientDataJSON;

      try {
        clientDataJSON = JSON.parse(
          Buffer.from(credential.response.clientDataJSON, "base64url").toString(
            "utf8",
          ),
        );
      } catch {
        return reply.code(400).send(null);
      }

      let challengeBytes;

      try {
        challengeBytes = Buffer.from(clientDataJSON.challenge, "base64url");
      } catch {
        return reply.code(400).send(null);
      }

      const {
        rows: [challenge],
      } = await pool.query(
        `
          DELETE FROM webauthn_challenges
          WHERE value = $1
            AND user_id IS NOT NULL
            AND expires_at > NOW()
          RETURNING user_id, value
        `,
        [challengeBytes],
      );

      if (!challenge) return reply.code(401).send(null);

      const userId = challenge.user_id;
      const expectedChallenge = Buffer.from(challenge.value).toString(
        "base64url",
      );

      /** @type {import('@simplewebauthn/server').VerifiedRegistrationResponse} */
      let verification;

      try {
        verification = await verifyRegistrationResponse({
          expectedChallenge,
          expectedOrigin: origin,
          expectedRPID: hostname,
          expectedType: "webauthn.create",
          requireUserVerification: true,
          response: {
            ...credential,
            clientExtensionResults: credential.clientExtensionResults ?? {},
          },
        });
      } catch {
        return reply.code(401).send(null);
      }

      if (!verification?.verified) return reply.code(401).send(null);

      const { registrationInfo } = verification;

      if (!registrationInfo?.credential) return reply.code(400).send(null);

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

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
            sign_count
          )
          SELECT
            $1,
            s,
            $2,
            $3,
            $4
          FROM next_index
        `,
          [
            userId,
            Buffer.from(registrationInfo.credential.id, "base64url"),
            Buffer.from(registrationInfo.credential.publicKey),
            registrationInfo.credential.counter,
          ],
        );

        // No slot available → user already has 5
        if (rowCount === 0) {
          await client.query("ROLLBACK");

          request.log.info(
            { userId },
            "user reached maximum WebAuthn credentials",
          );

          return reply.code(409).send(null);
        }

        await client.query("COMMIT");
        return reply.code(201).send(null);
      } catch (err) {
        await client.query("ROLLBACK");

        /** @type {any} */ const error = err;

        if (error?.code === "23505") return reply.code(409).send(null);

        if (["55P03", "57014"].includes(error?.code)) {
          request.log.warn(
            { code: error.code },
            "transient database failure during registration",
          );
          return reply.code(503).send(null);
        }

        request.log.error({ err }, "unexpected error during registration");
        return reply.code(500).send(null);
      } finally {
        client.release();
      }
    },
  );

  fastify.post(
    "/auth/webauthn/authentication/challenge",
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

      return reply.code(200).send({
        publicKey: {
          challenge: challenge.value.toString("base64url"),
          rpId: hostname,
          timeout: 60000,
          userVerification: "required",
        },
      });
    },
  );

  fastify.post(
    "/auth/webauthn/authentication",
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
      const { authentication } = request.body;

      let idBytes;
      let rawIdBytes;

      try {
        idBytes = Buffer.from(authentication.id, "base64url");
        rawIdBytes = Buffer.from(authentication.rawId, "base64url");
      } catch {
        return reply.code(400).send(null);
      }

      if (!idBytes.equals(rawIdBytes)) return reply.code(400).send(null);

      let clientDataJSON;

      try {
        clientDataJSON = JSON.parse(
          Buffer.from(
            authentication.response.clientDataJSON,
            "base64url",
          ).toString("utf8"),
        );
      } catch {
        return reply.code(400).send(null);
      }

      let providedChallengeBytes;

      try {
        providedChallengeBytes = Buffer.from(
          clientDataJSON.challenge,
          "base64url",
        );
      } catch {
        return reply.code(400).send(null);
      }

      const {
        rows: [challenge],
      } = await pool.query(
        `
          DELETE FROM webauthn_challenges
          WHERE value = $1
            AND user_id IS NULL
            AND expires_at > NOW()
          RETURNING user_id, value
        `,
        [providedChallengeBytes],
      );

      if (!challenge) return reply.code(401).send(null);

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const {
          rows: [credential],
        } = await client.query(
          `
            SELECT user_id, credential_id, public_key, sign_count
            FROM webauthn_credentials
            WHERE credential_id = $1
            FOR UPDATE
          `,
          [Buffer.from(authentication.id, "base64url")],
        );

        if (!credential) {
          await client.query("ROLLBACK");
          return reply.code(401).send(null);
        }

        const verification = await verifyAuthenticationResponse({
          credential: {
            counter: Number(credential.sign_count),
            id: Buffer.from(credential.credential_id).toString("base64url"),
            publicKey: new Uint8Array(credential.public_key),
          },
          expectedChallenge: Buffer.from(challenge.value).toString("base64url"),
          expectedOrigin: origin,
          expectedRPID: hostname,
          expectedType: "webauthn.get",
          requireUserVerification: true,
          response: {
            ...authentication,
            clientExtensionResults: authentication.clientExtensionResults ?? {},
          },
        });

        if (!verification.verified) {
          await client.query("ROLLBACK");
          return reply.code(401).send(null);
        }

        const { newCounter } = verification.authenticationInfo;
        const oldCounter = Number(credential.sign_count);

        // Monotonic counter enforcement
        // if (
        //   (oldCounter > 0 && newCounter === 0) ||
        //   (newCounter > 0 && newCounter <= oldCounter)
        // ) {
        //   await client.query("ROLLBACK");
        //   return reply.code(401).send(null);
        // }

        /**
         * 1. If the device supports a counter (newCounter > 0),
         * it MUST be greater than the old one.
         * 2. If the device reports 0, it's a synced passkey (or a 0-counter device).
         * We accept it, but we don't 'downgrade' our stored counter.
         */
        if (newCounter > 0) {
          if (newCounter <= oldCounter) {
            await client.query("ROLLBACK");
            return reply.code(401).send(null);
          }
        }

        // const { rowCount } = await client.query(
        //   `
        //     UPDATE webauthn_credentials
        //     SET sign_count = $2
        //     WHERE credential_id = $1
        //       AND (sign_count = 0 OR $2 > sign_count)
        //   `,
        //   [credential.credential_id, newCounter],
        // );

        // if (rowCount === 0) {
        //   await client.query("ROLLBACK");
        //   return reply.code(401).send(null);
        // }

        const { rowCount } = await client.query(
          `
            UPDATE webauthn_credentials
            SET sign_count = CASE 
              -- If new counter is greater, use it
              WHEN $2 > sign_count THEN $2 
              -- Otherwise, keep the existing count
              ELSE sign_count 
            END
            WHERE credential_id = $1
          `,
          [credential.credential_id, newCounter],
        );

        // rowCount will now be 1 as long as the credential_id exists
        if (rowCount === 0) {
          // This would only trigger if the credential was deleted during the transaction
          await client.query("ROLLBACK");
          return reply.code(401).send(null);
        }

        const { hash: refreshHash, token: refreshToken } =
          generateRefreshToken();

        const {
          rows: [session],
        } = await client.query(
          `
            INSERT INTO sessions
              (user_id, refresh_token_hash, refresh_expires_at)
            VALUES
              ($1, $2, NOW() + ($3::int * INTERVAL '1 second'))
            RETURNING id
          `,
          [credential.user_id, refreshHash, REFRESH_TTL_SECONDS],
        );

        await client.query(
          `
            INSERT INTO refresh_tokens
              (session_id, token_hash)
            VALUES
              ($1, $2)
          `,
          [session.id, refreshHash],
        );

        await client.query("COMMIT");

        reply.header("Cache-Control", "no-store");
        reply.header("Pragma", "no-cache");

        return reply.code(200).send({ refresh_token: refreshToken });
      } catch (err) {
        await client.query("ROLLBACK");

        /** @type {any} */ const error = err;

        if (["55P03", "57014"].includes(error?.code)) {
          request.log.warn(
            { code: error.code },
            "transient database failure during authentication",
          );
          return reply.code(503).send(null);
        }

        request.log.error({ err }, "unexpected error during authentication");
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

      const incomingHash = createHash("sha256").update(refresh_token).digest();

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const consumeResult = await client.query(
          `
          UPDATE refresh_tokens t
          SET used_at = NOW()
          FROM sessions s
          WHERE t.token_hash = $1
            AND t.used_at IS NULL
            AND t.reused_at IS NULL
            AND t.session_id = s.id
            AND s.revoked_at IS NULL
            AND s.refresh_expires_at > NOW()
          RETURNING
            t.id AS token_id,
            s.id AS session_id,
            s.user_id
        `,
          [incomingHash],
        );

        const consumed = consumeResult.rows[0];

        if (!consumed) {
          const existingResult = await client.query(
            `
            SELECT
              t.session_id,
              t.used_at,
              t.reused_at,
              s.revoked_at,
              s.refresh_expires_at
            FROM refresh_tokens t
            JOIN sessions s ON s.id = t.session_id
            WHERE t.token_hash = $1
            FOR UPDATE OF t, s
          `,
            [incomingHash],
          );

          const existing = existingResult.rows[0];

          if (!existing) {
            await client.query("ROLLBACK");
            return reply.code(401).send(null);
          }

          const isReplay =
            existing.used_at !== null || existing.reused_at !== null;

          if (!isReplay) {
            await client.query("ROLLBACK");
            return reply.code(401).send(null);
          }

          await client.query(
            `
            UPDATE refresh_tokens
            SET reused_at = NOW()
            WHERE token_hash = $1
              AND reused_at IS NULL
          `,
            [incomingHash],
          );

          await client.query(
            `
            UPDATE sessions
            SET revoked_at = NOW()
            WHERE id = $1
              AND revoked_at IS NULL
          `,
            [existing.session_id],
          );

          await client.query("COMMIT");

          request.log.warn(
            { sessionId: existing.session_id },
            "refresh token reuse detected",
          );

          return reply.code(401).send(null);
        }

        const { hash: newHash, token: newRefresh } = generateRefreshToken();

        const sessionUpdateResult = await client.query(
          `
          UPDATE sessions
          SET refresh_expires_at =
            NOW() + ($2::int * INTERVAL '1 second')
          WHERE id = $1
            AND revoked_at IS NULL
          RETURNING id
        `,
          [consumed.session_id, REFRESH_TTL_SECONDS],
        );

        if (sessionUpdateResult.rowCount === 0) {
          await client.query("ROLLBACK");
          return reply.code(401).send(null);
        }

        await client.query(
          `
          INSERT INTO refresh_tokens
            (session_id, token_hash, parent_token_id)
          VALUES
            ($1, $2, $3)
        `,
          [consumed.session_id, newHash, consumed.token_id],
        );

        // Mint
        const now = Math.floor(Date.now() / 1000);
        const exp = now + ACCESS_TTL_SECONDS;

        const accessToken = await new SignJWT({
          scope: [],
        })
          .setProtectedHeader({ alg: "ES256", kid: JWT_KID, typ: "JWT" })
          .setIssuer(ISSUER)
          .setSubject(consumed.user_id)
          // TODO: Set 'aud' per claims of his plan
          .setAudience([])
          .setIssuedAt(now)
          .setExpirationTime(exp)
          .setJti(randomBytes(16).toString("base64url"))
          .sign(privateKey);

        await client.query("COMMIT");

        reply.header("Cache-Control", "no-store");
        reply.header("Pragma", "no-cache");

        return reply.code(200).send({
          access_token: accessToken,
          refresh_token: newRefresh,
        });
      } catch (err) {
        await client.query("ROLLBACK");

        /** @type {any} */
        const error = err;

        if (["55P03", "57014"].includes(error?.code)) {
          request.log.warn(
            { code: error.code },
            "transient database failure during token refresh",
          );
          return reply.code(503).send(null);
        }

        if (error?.code === "23505") {
          request.log.warn(
            { code: error.code },
            "refresh token rotation conflict",
          );
          return reply.code(401).send(null);
        }

        request.log.error({ err }, "unexpected error during token refresh");
        return reply.code(500).send(null);
      } finally {
        client.release();
      }
    },
  );
};
