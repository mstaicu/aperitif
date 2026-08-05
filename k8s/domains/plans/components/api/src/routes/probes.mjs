/**
 * @param {import("fastify").FastifyInstance} fastify
 * @param {{ pool: import("pg").Pool }} opts
 */
export default async (fastify, { pool }) => {
  fastify.get("/livez", { logLevel: "silent" }, () => ({ ok: true }));
  fastify.get("/readyz", { logLevel: "silent" }, async (_, reply) => {
    try {
      await pool.query("SELECT 1");

      return { ok: true };
    } catch {
      return reply.code(503).send({ ok: false });
    }
  });
};
