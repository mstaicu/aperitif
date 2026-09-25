/**
 * @param {import("fastify").FastifyInstance} fastify
 * @param {{ jwks: { keys: import("jose").JWK[] } }} opts
 */
export default async (fastify, { jwks }) => {
  fastify.get("/.well-known/jwks.json", async (_, reply) => {
    reply.header("Cache-Control", "public, max-age=300");

    return reply.code(200).send(jwks);
  });
};
