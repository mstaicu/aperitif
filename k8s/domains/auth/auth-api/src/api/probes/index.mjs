/**
 * @param {import("fastify").FastifyInstance} fastify
 * @param {import("../../fastify.js").WithCtx} opts
 */
export default async (fastify, opts) => {
  const { ctx } = opts;

  fastify.get("/healthz", { logLevel: "silent" }, () => ({ ok: true }));
  fastify.get("/readyz", { logLevel: "silent" }, async (_, reply) => {
    try {
      await ctx.db.query("SELECT 1");

      // if (fastify.nc && fastify.nc.isClosed()) {
      //   throw new Error();
      // }

      return { ok: true };
    } catch {
      return reply.code(503).send({ ok: false });
    }
  });
};
