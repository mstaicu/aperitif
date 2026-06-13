import { ProblemResponse } from "../../../../problem-details.mjs";
import {
  RegistrationChallengeBody,
  RegistrationChallengeResponse,
} from "./passkey.schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../../../services/passkeys/index.mjs").PasskeysService} PasskeysService
 */

/**
 * @param {Fastify} fastify
 * @param {{passkeys: PasskeysService}} opts
 */
export default async function (fastify, { passkeys }) {
  fastify.post(
    "/register/challenge",
    {
      schema: {
        body: RegistrationChallengeBody,
        description:
          "Generates and persists a one-time WebAuthn credential creation challenge used to create a new identity.",
        operationId: "createPasskeyRegistrationChallenge",
        response: {
          200: RegistrationChallengeResponse,
          400: ProblemResponse,
          404: ProblemResponse,
          409: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        summary: "Create passkey registration challenge",
        tags: ["passkeys"],
      },
    },
    async function (req, reply) {
      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      return reply.code(200).send({
        publicKey: await passkeys.createRegisterChallenge({
          email: req.body?.email,
        }),
      });
    },
  );
}
