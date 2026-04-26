import { ProblemResponse } from "../../../../shared/schemas.mjs";
import { SessionTokenResponse } from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../../../domains/sessions/index.mjs").SessionsDomain} SessionsDomain
 */

/**
 * @param {Fastify} fastify
 * @param {{sessions: SessionsDomain}} opts
 */
export default async function (fastify, { sessions }) {
  fastify.post(
    "/token",
    {
      schema: {
        description:
          "Exchange a refresh token provided in the Authorization bearer header for a short-lived product API access token. The minted token uses the identities service configured JWT audience.",
        operationId: "exchangeSessionToken",
        response: {
          200: SessionTokenResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ refreshTokenAuth: [] }],
        summary: "Mint product API access token",
        tags: ["sessions"],
      },
    },
    async function (req, reply) {
      const [type, token] = (req.headers.authorization || "").split(" ");

      if (type !== "Bearer" || !token) {
        throw new Error("INVALID_AUTHORIZATION_HEADER");
      }

      reply.header("Cache-Control", "no-store");

      return reply.send(
        await sessions.createAccessToken({ refresh_token: token }),
      );
    },
  );
}
