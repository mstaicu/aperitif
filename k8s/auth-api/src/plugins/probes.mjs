import fp from "fastify-plugin";

export const probesPlugin = fp(function (fastify) {
  fastify.get("/healthz", async () => {
    return { ok: true };
  });

  fastify.get("/readyz", async (_, reply) => {
    try {
      await fastify.pool.query("SELECT 1");

      // if (fastify.nc && fastify.nc.isClosed()) {
      //   throw new Error();
      // }

      return { ok: true };
    } catch {
      return reply.code(503).send({ ok: false });
    }
  });
});
