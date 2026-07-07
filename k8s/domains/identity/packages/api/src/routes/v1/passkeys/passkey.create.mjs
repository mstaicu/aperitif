import { ProblemResponse } from "../../../api/problem-details.mjs";
import { verifyAccessToken } from "../../../platform/security/jwt.mjs";
import { PasskeyRegistrationBody } from "./passkey.schemas.mjs";

/**
 * @param {import("../../../app.mjs").FastifyInstance} fastify
 * @param {{
 *   jwks: import("../../../platform/security/index.mjs").JwtKeys["jwks"],
 *   passkeys: import("../../../services/passkeys/index.mjs").PasskeysService,
 *   prefix: string,
 * }} opts
 */
export function registerPasskeyCreateRoute(
  fastify,
  { jwks, passkeys, prefix },
) {
  fastify.post(
    prefix,
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
