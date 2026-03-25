import refresh from "./refresh.mjs";
import token from "./token.mjs";

/**
 * @param {import('../../../../../fastify.js').FastifyInstance} fastify
 */
export default async function sessionRoutes(fastify) {
  await fastify.register(refresh);
  await fastify.register(token);
}
