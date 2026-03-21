import exchange from "./exchange.mjs";
import refresh from "./refresh.mjs";

/**
 * @param {import('../../../../../fastify.js').FastifyInstance} fastify
 */
export default async function sessionRoutes(fastify) {
  await fastify.register(refresh);
  await fastify.register(exchange);
}
