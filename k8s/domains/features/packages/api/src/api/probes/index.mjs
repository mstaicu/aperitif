/**
 * @typedef { import("pg").Pool } Db
 */

/**
 * @param {import("fastify").FastifyInstance} fastify
 * @param {{db: Db}} opts
 */
export default async (fastify, { db }) => {
  fastify.get("/healthz", { logLevel: "silent" }, () => ({ ok: true }));
  fastify.get("/readyz", { logLevel: "silent" }, async (_, reply) => {
    try {
      await db.query("SELECT 1");

      return { ok: true };
    } catch {
      return reply.code(503).send({ ok: false });
    }
  });
};
