import { verifyAccessToken } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../problem-details.mjs";
import { RegistrationChallengeResponse } from "./passkey.schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../../../platform/runtime.mjs").Runtime["security"]} Security
 * @typedef {import("../../../../../services/passkeys/index.mjs").PasskeysService} PasskeysService
 */

/**
 * @param {Fastify} fastify
 * @param {{passkeys: PasskeysService, security: Security}} opts
 */
export default async function (fastify, { passkeys, security }) {
  fastify.post(
    "/challenge",
    {
      schema: {
        description:
          "Generates and persists a one-time WebAuthn credential creation challenge used to add a passkey to the current identity.",
        operationId: "createPasskeyChallenge",
        response: {
          200: RegistrationChallengeResponse,
          401: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Create passkey challenge",
        tags: ["passkeys"],
      },
    },
    async function (req, reply) {
      const payload = await verifyAccessToken({
        authorization: req.headers.authorization,
        jwks: security.jwks,
      });

      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      return reply.code(200).send({
        publicKey: await passkeys.createPasskeyChallenge({
          userId: payload.sub,
        }),
      });
    },
  );
}
