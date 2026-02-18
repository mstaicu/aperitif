// @ts-check
import { server } from "@passwordless-id/webauthn";
import nconf from "nconf";
import { randomUUID } from "node:crypto";

var { hostname, origin } = new URL(nconf.get("ORIGIN"));

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
        rows: [row],
      } = await pool.query(
        `
        INSERT INTO webauthn_challenges (user_id)
        VALUES ($1)
        RETURNING value
      `,
        [userId],
      );

      var challenge = row.value.toString("base64url");

      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      return reply.code(200).send({
        publicKey: {
          attestation: "none",
          authenticatorSelection: {
            residentKey: "required",
            userVerification: "required",
          },
          challenge,
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

      let clientData;

      try {
        clientData = JSON.parse(
          Buffer.from(credential.response.clientDataJSON, "base64url").toString(
            "utf8",
          ),
        );
      } catch {
        return reply.code(400).send();
      }

      if (
        clientData.type !== "webauthn.create" ||
        clientData.origin !== origin
      ) {
        return reply.code(400).send();
      }

      var challengeBytes = Buffer.from(clientData.challenge, "base64url");

      var {
        rows: [challengeRow],
      } = await pool.query(
        `
        DELETE FROM webauthn_challenges
        WHERE value = $1
          AND expires_at > NOW()
        RETURNING user_id
      `,
        [challengeBytes],
      );

      if (!challengeRow) {
        return reply.code(400).send();
      }

      var userId = challengeRow.user_id;

      var {
        rows: [{ count: earlyCount }],
      } = await pool.query(
        `
        SELECT COUNT(*)::int AS count
        FROM webauthn_credentials
        WHERE user_id = $1
      `,
        [userId],
      );

      if (earlyCount >= 5) {
        return reply.code(409).send();
      }

      let result;

      try {
        result = await server.verifyRegistration(credential, {
          challenge: clientData.challenge,
          origin,
          // rpId: hostname,
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

        // Ensure user exists
        await client.query(
          `INSERT INTO users (id) VALUES ($1) ON CONFLICT DO NOTHING`,
          [userId],
        );

        await client.query(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [
          userId,
        ]);

        var {
          rows: [{ count }],
        } = await client.query(
          `
          SELECT COUNT(*)::int AS count
          FROM webauthn_credentials
          WHERE user_id = $1
        `,
          [userId],
        );

        if (count >= 5) {
          await client.query("ROLLBACK");
          return reply.code(409).send();
        }

        await client.query(
          `
          INSERT INTO webauthn_credentials
          (
            user_id,
            credential_id,
            public_key,
            algorithm,
            transports,
            sign_count
          )
          VALUES ($1, $2, $3, $4, $5, $6)
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

        await client.query("COMMIT");
        return reply.code(201).send();
      } catch (err) {
        await client.query("ROLLBACK");

        /** @type {any} */
        var error = err;

        if (error.code === "23505") {
          return reply.code(409).send();
        }

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
        rows: [row],
      } = await pool.query(
        `
          INSERT INTO webauthn_challenges (user_id)
          VALUES (NULL)
          RETURNING value
        `,
      );

      var challenge = row.value.toString("base64url");

      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      return reply.code(200).send({
        publicKey: {
          challenge,
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
          200: EmptyResponse,
          401: ErrorResponse,
          500: ErrorResponse,
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

      if (clientData.type !== "webauthn.get" || clientData.origin !== origin) {
        return reply.code(401).send();
      }

      var client = await pool.connect();

      try {
        await client.query("BEGIN");

        var challengeBytes = Buffer.from(clientData.challenge, "base64url");

        var {
          rows: [challengeRow],
        } = await client.query(
          `
            DELETE FROM webauthn_challenges
            WHERE value = $1
              AND expires_at > NOW()
            RETURNING 1
          `,
          [challengeBytes],
        );

        if (!challengeRow) {
          await client.query("ROLLBACK");
          return reply.code(401).send();
        }

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

        var expected = {
          challenge: clientData.challenge,
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
            [credentialId, newCounter],
          );

          if (rowCount === 0) {
            await client.query("ROLLBACK");
            return reply.code(401).send();
          }
        }

        await client.query("COMMIT");
        return reply.code(200).send();
      } catch {
        await client.query("ROLLBACK");
        return reply.code(500).send();
      } finally {
        client.release();
      }
    },
  );
};
