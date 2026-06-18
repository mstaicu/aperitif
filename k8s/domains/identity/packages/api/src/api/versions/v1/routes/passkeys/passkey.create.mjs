import { verifyAccessToken } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../problem-details.mjs";
import { PasskeyRegistrationBody } from "./passkey.schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../../../platform/security/index.mjs").JwtKeys["jwks"]} JsonWebKeySet
 * @typedef {import("../../../../../services/passkeys/index.mjs").PasskeysService} PasskeysService
 */

/**
 * @param {Fastify} fastify
 * @param {{jwks: JsonWebKeySet, passkeys: PasskeysService}} opts
 */
export default async function (fastify, { jwks, passkeys }) {
  fastify.post(
    "",
    {
      schema: {
        body: PasskeyRegistrationBody,
        description:
          "Verifies the WebAuthn registration response and stores a passkey for the current identity.",
        operationId: "createPasskey",
        response: {
          204: {
            description: "Passkey added.",
          },
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          409: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Add passkey",
        tags: ["passkeys"],
      },
    },
    async function (req, reply) {
      const payload = await verifyAccessToken({
        authorization: req.headers.authorization,
        jwks,
      });

      await passkeys.createPasskey({
        credential: req.body.credential,
        userId: payload.sub,
      });

      return reply.code(204).send();
    },
  );
}
