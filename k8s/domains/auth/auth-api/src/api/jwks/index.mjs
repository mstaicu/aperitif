/**
 * @typedef { import("../../context.mjs").Context} Ctx
 */

/**
 * @param {import("fastify").FastifyInstance} fastify
 * @param {{ctx: Ctx}} opts
 */
export default (fastify, { ctx }) => {
  fastify.get("/.well-known/jwks.json", async (_, reply) => {
    reply.header("Cache-Control", "public, max-age=300, immutable");

    return reply.code(200).send(ctx.jwt.jwks);
  });
};
