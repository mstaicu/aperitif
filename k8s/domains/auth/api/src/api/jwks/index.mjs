/**
 * @typedef {{ keys: import("jose").JWK[] }} Jwks
 */

/**
 * @param {import("fastify").FastifyInstance} fastify
 * @param {{jwks: Jwks}} opts
 */
export default (fastify, { jwks }) => {
  fastify.get("/.well-known/jwks.json", async (_, reply) => {
    reply.header("Cache-Control", "public, max-age=300, immutable");

    return reply.code(200).send(jwks);
  });
};
