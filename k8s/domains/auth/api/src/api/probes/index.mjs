/**
 * @typedef { import("../../context.mjs").Context} Ctx
 */

/**
 * @param {import("fastify").FastifyInstance} fastify
 * @param {{ctx: Ctx}} opts
 */
export default async (fastify, { ctx }) => {
  fastify.get("/healthz", { logLevel: "silent" }, () => ({ ok: true }));
  fastify.get("/readyz", { logLevel: "silent" }, async (_, reply) => {
    try {
      await ctx.data.db.query("SELECT 1");

      // if (fastify.nc && fastify.nc.isClosed()) {
      //   throw new Error();
      // }

      return { ok: true };
    } catch {
      return reply.code(503).send({ ok: false });
    }
  });
};
