import { trace } from "@opentelemetry/api";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { Type } from "@sinclair/typebox";
// import { importPKCS8 } from "jose";
import nconf from "nconf";
// import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createHash, randomBytes } from "node:crypto";
// import fs from "node:fs";

const { hostname, origin } = new URL(nconf.get("ORIGIN"));

// const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

// const privateKeyPem = fs.readFileSync(
//   nconf.get("JWT_PRIVATE_KEY_PATH"),
//   "utf8",
// );

// const privateKey = await importPKCS8(privateKeyPem, "ES256");

function generateRefreshToken() {
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest();
  return { hash, token };
}

const Base64URLString = Type.String({
  maxLength: 8192,
  minLength: 1,
  pattern: "^[A-Za-z0-9_-]+={0,2}$",
});
export const AuthenticatorTransport = Type.Union([
  Type.Literal("ble"),
  Type.Literal("cable"),
  Type.Literal("hybrid"),
  Type.Literal("internal"),
  Type.Literal("nfc"),
  Type.Literal("smart-card"),
  Type.Literal("usb"),
]);

const PublicKeyCredentialDescriptorJSON = Type.Object({
  id: Base64URLString,
  transports: Type.Optional(Type.Array(AuthenticatorTransport)),
  type: Type.Literal("public-key"),
});

const PublicKeyCredentialUserEntityJSON = Type.Object({
  displayName: Type.String(),
  id: Base64URLString,
  name: Type.String(),
});

const PublicKeyCredentialParameters = Type.Object({
  alg: Type.Integer(),
  type: Type.Literal("public-key"),
});

const AuthenticatorSelectionCriteria = Type.Object({
  authenticatorAttachment: Type.Optional(
    Type.Union([Type.Literal("platform"), Type.Literal("cross-platform")]),
  ),
  requireResidentKey: Type.Optional(Type.Boolean()),
  residentKey: Type.Optional(Type.String()),
  userVerification: Type.Optional(
    Type.Union([
      Type.Literal("required"),
      Type.Literal("preferred"),
      Type.Literal("discouraged"),
    ]),
  ),
});

const RegistrationChallengeResponse = Type.Object({
  publicKey: Type.Object({
    attestation: Type.Optional(Type.String()),

    authenticatorSelection: Type.Optional(AuthenticatorSelectionCriteria),

    challenge: Base64URLString,

    excludeCredentials: Type.Optional(
      Type.Array(PublicKeyCredentialDescriptorJSON),
    ),

    extensions: Type.Optional(Type.Unknown()),

    pubKeyCredParams: Type.Array(PublicKeyCredentialParameters),

    rp: Type.Object({
      id: Type.Optional(Type.String()),
      name: Type.String(),
    }),

    timeout: Type.Optional(Type.Integer()),

    user: PublicKeyCredentialUserEntityJSON,
  }),
});

const AuthenticationChallengeResponse = Type.Object({
  publicKey: Type.Object({
    allowCredentials: Type.Optional(
      Type.Array(PublicKeyCredentialDescriptorJSON),
    ),

    challenge: Base64URLString,

    extensions: Type.Optional(Type.Unknown()),

    rpId: Type.Optional(Type.String()),

    timeout: Type.Optional(Type.Integer()),

    userVerification: Type.Optional(
      Type.Union([
        Type.Literal("required"),
        Type.Literal("preferred"),
        Type.Literal("discouraged"),
      ]),
    ),
  }),
});

const AuthenticatorAttestationResponseJSON = Type.Object({
  attestationObject: Base64URLString,
  authenticatorData: Type.Optional(Base64URLString),
  clientDataJSON: Base64URLString,
  publicKey: Type.Optional(Base64URLString),
  publicKeyAlgorithm: Type.Optional(Type.Integer()),
  transports: Type.Optional(Type.Array(AuthenticatorTransport)),
});

const AuthenticatorAssertionResponseJSON = Type.Object({
  authenticatorData: Base64URLString,
  clientDataJSON: Base64URLString,
  signature: Base64URLString,
  userHandle: Type.Optional(Base64URLString),
});

const RegistrationResponseJSON = Type.Object({
  authenticatorAttachment: Type.Optional(
    Type.Union([Type.Literal("platform"), Type.Literal("cross-platform")]),
  ),
  clientExtensionResults: Type.Record(Type.String(), Type.Any()),
  id: Base64URLString,
  rawId: Base64URLString,
  response: AuthenticatorAttestationResponseJSON,
  type: Type.Literal("public-key"),
});

const AuthenticationResponseJSON = Type.Object({
  authenticatorAttachment: Type.Optional(
    Type.Union([Type.Literal("platform"), Type.Literal("cross-platform")]),
  ),
  clientExtensionResults: Type.Record(Type.String(), Type.Any()),
  id: Base64URLString,
  rawId: Base64URLString,
  response: AuthenticatorAssertionResponseJSON,
  type: Type.Literal("public-key"),
});

const RegistrationFinalizeBody = Type.Object({
  credential: RegistrationResponseJSON,
});

const AuthenticationFinalizeBody = Type.Object({
  authentication: AuthenticationResponseJSON,
});

const AuthSuccessResponse = Type.Object({
  refresh_token: Type.String(),
});

const RefreshBody = Type.Object({
  refresh_token: Type.String(),
});

const RefreshResponse = Type.Object({
  access_token: Type.String(),
  refresh_token: Type.String(),
});

const ErrorResponse = Type.Null();
const EmptyResponse = Type.Null();

/**
 * @param {import('../../../../../fastify.js').FastifyInstance} fastify
 */
export const routes = async (fastify) => {
  const { pool } = fastify;

  fastify.post(
    "/v1/passkeys/register/challenge",
    {
      schema: {
        response: {
          200: RegistrationChallengeResponse,
        },
      },
    },
    async (_, reply) => {
      trace.getActiveSpan()?.updateName("auth.registration.challenge");

      const userID = randomBytes(32);
      const challenge = randomBytes(32);

      const options = await generateRegistrationOptions({
        attestationType: "none",
        authenticatorSelection: {
          residentKey: "required",
          userVerification: "required",
        },
        challenge,
        rpID: hostname,
        rpName: hostname,
        timeout: 60000,
        userID,
        userName: userID.toString("base64url"),
      });

      const pgSpan = trace
        .getTracer("auth-api")
        .startSpan("auth.registration.challenge_persist");

      await pool.query(
        `
          INSERT INTO challenges (user_id, challenge)
          VALUES ($1, $2)
        `,
        [userID, challenge],
      );

      pgSpan.end();

      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      return reply.code(200).send({ publicKey: options });
    },
  );

  fastify.post(
    "/v1/passkeys/register",
    {
      schema: {
        body: RegistrationFinalizeBody,
        response: {
          201: EmptyResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          409: ErrorResponse,
          500: ErrorResponse,
        },
      },
    },
    async function (request, reply) {
      const { credential } = request.body;

      if (credential.id !== credential.rawId) {
        return reply.code(400).send(null);
      }

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

      if (
        !clientDataJSON ||
        typeof clientDataJSON !== "object" ||
        typeof clientDataJSON.challenge !== "string"
      ) {
        return reply.code(400).send(null);
      }

      let challengeBytes;

      try {
        challengeBytes = Buffer.from(clientDataJSON.challenge, "base64url");
      } catch {
        return reply.code(400).send(null);
      }

      const {
        rows: [challengeRow],
      } = await pool.query(
        `
          DELETE FROM challenges
          WHERE challenge = $1
            AND user_id IS NOT NULL
            AND expires_at > NOW()
          RETURNING user_id, challenge
        `,
        [challengeBytes],
      );

      if (!challengeRow?.user_id || !challengeRow?.challenge) {
        return reply.code(401).send(null);
      }

      /** @type {Buffer} */
      const userId = challengeRow.user_id;
      const expectedChallenge = challengeRow.challenge.toString("base64url");

      let verification;

      try {
        verification = await verifyRegistrationResponse({
          expectedChallenge,
          expectedOrigin: origin,
          expectedRPID: hostname,
          requireUserVerification: true,
          response: {
            ...credential,
            clientExtensionResults: credential.clientExtensionResults ?? {},
          },
        });
      } catch {
        return reply.code(401).send(null);
      }

      if (
        !verification?.verified ||
        !verification.registrationInfo?.credential
      ) {
        return reply.code(401).send(null);
      }

      const registrationCredential = verification.registrationInfo.credential;

      if (
        typeof registrationCredential.id !== "string" ||
        !registrationCredential.publicKey
      ) {
        return reply.code(400).send(null);
      }

      if (credential.id !== registrationCredential.id) {
        return reply.code(400).send(null);
      }

      const credentialId = Buffer.from(registrationCredential.id, "base64url");
      const publicKey = Buffer.from(registrationCredential.publicKey);
      const signCount = registrationCredential.counter;

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        await client.query(
          `
            INSERT INTO users (id)
            VALUES ($1)
            ON CONFLICT DO NOTHING
          `,
          [userId],
        );

        await client.query(
          `
            INSERT INTO credentials
            (
              user_id,
              credential_id,
              public_key,
              sign_count
            )
            VALUES ($1, $2, $3, $4)
          `,
          [userId, credentialId, publicKey, signCount],
        );

        await client.query("COMMIT");

        // const { hash, token: refreshToken } = generateRefreshToken();

        // await client.query(
        //   `
        //     INSERT INTO sessions (user_id, refresh_token_hash, expires_at)
        //     VALUES ($1, $2, NOW() + INTERVAL '30 days')
        //   `,
        //   [userId, hash],
        // );

        // await client.query("COMMIT");

        // reply.header("Cache-Control", "no-store");
        // reply.header("Pragma", "no-cache");

        // return reply.code(200).send({
        //   access_token,
        //   refresh_token: refreshToken,
        // });

        return reply.code(201).send(null);
      } catch (err) {
        await client.query("ROLLBACK");

        /** @type {any} */
        const error = err;

        if (error?.code === "23505") {
          return reply.code(409).send(null);
        }

        return reply.code(500).send(null);
      } finally {
        client.release();
      }
    },
  );

  fastify.post(
    "/v1/passkeys/login/challenge",
    {
      schema: { response: { 200: AuthenticationChallengeResponse } },
    },
    async (_, reply) => {
      const challenge = randomBytes(32);

      const options = await generateAuthenticationOptions({
        challenge,
        rpID: hostname,
        userVerification: "required",
      });

      await pool.query(
        `
          INSERT INTO challenges (user_id, challenge)
          VALUES (NULL, $1)
        `,
        [challenge],
      );

      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      return reply.send({ publicKey: options });
    },
  );

  fastify.post(
    "/v1/passkeys/login",
    {
      schema: {
        body: AuthenticationFinalizeBody,
        response: {
          200: AuthSuccessResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          500: ErrorResponse,
        },
      },
    },
    async function (request, reply) {
      const { authentication } = request.body;

      if (authentication.id !== authentication.rawId) {
        return reply.code(400).send(null);
      }

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

      if (
        !clientDataJSON ||
        typeof clientDataJSON !== "object" ||
        typeof clientDataJSON.challenge !== "string"
      ) {
        return reply.code(400).send(null);
      }

      let challengeBytes;

      try {
        challengeBytes = Buffer.from(clientDataJSON.challenge, "base64url");
      } catch {
        return reply.code(400).send(null);
      }

      const {
        rows: [challengeRow],
      } = await pool.query(
        `
          DELETE FROM challenges
          WHERE challenge = $1
            AND user_id IS NULL
            AND expires_at > NOW()
          RETURNING challenge
        `,
        [challengeBytes],
      );

      if (!challengeRow) {
        return reply.code(401).send(null);
      }

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const {
          rows: [credential],
        } = await client.query(
          `
            SELECT user_id, credential_id, public_key, sign_count
            FROM credentials
            WHERE credential_id = $1
            FOR UPDATE
          `,
          [Buffer.from(authentication.id, "base64url")],
        );

        if (!credential) {
          await client.query("ROLLBACK");
          return reply.code(401).send(null);
        }

        if (authentication.response.userHandle) {
          const userHandle = Buffer.from(
            authentication.response.userHandle,
            "base64url",
          );

          if (!userHandle.equals(credential.user_id)) {
            await client.query("ROLLBACK");
            return reply.code(401).send(null);
          }
        }

        let verification;

        try {
          verification = await verifyAuthenticationResponse({
            credential: {
              counter: Number(credential.sign_count),
              id: credential.credential_id.toString("base64url"),
              publicKey: new Uint8Array(credential.public_key),
            },
            expectedChallenge: challengeRow.challenge.toString("base64url"),
            expectedOrigin: origin,
            expectedRPID: hostname,
            requireUserVerification: true,
            response: {
              ...authentication,
              clientExtensionResults:
                authentication.clientExtensionResults ?? {},
            },
          });
        } catch {
          await client.query("ROLLBACK");
          return reply.code(401).send(null);
        }

        if (!verification.verified) {
          await client.query("ROLLBACK");
          return reply.code(401).send(null);
        }

        const newCounter = verification.authenticationInfo.newCounter;
        const oldCounter = Number(credential.sign_count);

        if (newCounter > 0 && newCounter <= oldCounter) {
          await client.query("ROLLBACK");
          return reply.code(401).send(null);
        }

        await client.query(
          `
            UPDATE credentials
            SET sign_count =
              CASE
                WHEN $2 > sign_count THEN $2
                ELSE sign_count
              END
            WHERE credential_id = $1
          `,
          [credential.credential_id, newCounter],
        );

        await client.query("COMMIT");

        // const { hash, token: refreshToken } = generateRefreshToken();

        // await client.query(
        //   `
        //     INSERT INTO sessions (user_id, refresh_token_hash, expires_at)
        //     VALUES ($1, $2, NOW() + INTERVAL '30 days')
        //   `,
        //   [userId, hash],
        // );

        // await client.query("COMMIT");

        // reply.header("Cache-Control", "no-store");
        // reply.header("Pragma", "no-cache");

        // return reply.code(200).send({
        //   access_token,
        //   refresh_token: refreshToken,
        // });

        reply.header("Cache-Control", "no-store");
        reply.header("Pragma", "no-cache");

        return reply.code(200).send({
          refresh_token: "TODO",
        });
      } catch {
        await client.query("ROLLBACK");

        return reply.code(500).send(null);
      } finally {
        client.release();
      }
    },
  );

  fastify.post(
    "/v1/sessions/refresh",
    {
      schema: {
        body: RefreshBody,
        response: {
          200: RefreshResponse,
          401: EmptyResponse,
          500: EmptyResponse,
        },
      },
    },
    async (request, reply) => {
      const { refresh_token } = request.body;

      if (!refresh_token || typeof refresh_token !== "string") {
        return reply.code(401).send(null);
      }

      const hash = createHash("sha256").update(refresh_token).digest();

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const {
          rows: [session],
        } = await client.query(
          `
            SELECT id, user_id
            FROM sessions
            WHERE refresh_token_hash = $1
              AND revoked_at IS NULL
              AND expires_at > NOW()
            FOR UPDATE
          `,
          [hash],
        );

        if (!session) {
          await client.query("ROLLBACK");
          return reply.code(401).send(null);
        }

        const { hash: newHash, token: newRefreshToken } =
          generateRefreshToken();

        await client.query(
          `
            UPDATE sessions
            SET
              refresh_token_hash = $2,
              last_refreshed_at = NOW()
            WHERE id = $1
          `,
          [session.id, newHash],
        );

        // const accessToken = signAccessToken(session.user_id);

        await client.query("COMMIT");

        return reply.send({
          access_token: "",
          refresh_token: newRefreshToken,
        });
      } catch {
        await client.query("ROLLBACK");
        return reply.code(500).send(null);
      } finally {
        client.release();
      }
    },
  );
};

// import registerChallenge from "./register.challenge.mjs"
// import registerFinalize from "./register.finalize.mjs"
// import loginChallenge from "./login.challenge.mjs"
// import loginFinalize from "./login.finalize.mjs"

// export default async function passkeys(fastify) {
//   fastify.post("/register/challenge", registerChallenge)
//   fastify.post("/register", registerFinalize)

//   fastify.post("/login/challenge", loginChallenge)
//   fastify.post("/login", loginFinalize)
// }
