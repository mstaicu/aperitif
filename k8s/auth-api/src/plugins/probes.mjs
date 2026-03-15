import fp from "fastify-plugin";

export const probesPlugin = fp(async (fastify) => {
  fastify.get("/healthz", { logLevel: "silent" }, () => ({ ok: true }));
  fastify.get("/readyz", { logLevel: "silent" }, async (_, reply) => {
    try {
      await fastify.pool.query("SELECT 1");

      /**
       * This is like Math.min(pg, default)
       */
      // await Promise.race([
      //   fastify.pool.query("SELECT 1"),
      //   new Promise((_, reject) =>
      //     setTimeout(() => reject(new Error("timeout")), 500),
      //   ),
      // ]);

      // if (fastify.nc && fastify.nc.isClosed()) {
      //   throw new Error();
      // }

      return { ok: true };
    } catch {
      return reply.code(503).send({ ok: false });
    }
  });
});
