/**
 * @param {import("fastify").FastifyInstance} fastify
 * @param {{ pool: import("pg").Pool }} opts
 */
export default async (fastify, { pool }) => {
  fastify.get("/livez", { logLevel: "silent" }, () => ({ ok: true }));
  fastify.get("/readyz", { logLevel: "silent" }, async (_, reply) => {
    try {
      const { rowCount } = await pool.query(`
        SELECT 1
        WHERE to_regclass('public.outbox_messages') IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM flyway_schema_history
            WHERE success
          )
          AND NOT EXISTS (
            SELECT 1
            FROM flyway_schema_history
            WHERE NOT success
          )
      `);

      return rowCount === 1
        ? { ok: true }
        : reply.code(503).send({ ok: false });
    } catch {
      return reply.code(503).send({ ok: false });
    }
  });
};
