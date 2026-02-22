import { TypeBoxValidatorCompiler } from "@fastify/type-provider-typebox";
import Fastify from "fastify";

import { routes as auth } from "./routes/auth.mjs";
import { routes as jwks } from "./routes/jwks.mjs";

/** @typedef {import('@fastify/type-provider-typebox').TypeBoxTypeProvider} TypeBoxTypeProvider */

/**
 * @param {{ pool: import("pg").Pool }} deps
 */
export async function buildApp({ pool }) {
  const fastify = Fastify({
    bodyLimit: 64 * 1024,
    keepAliveTimeout: 5_000,
    requestTimeout: 10_000,
    // Only enable if you explicitly trust Traefik subnet
    trustProxy: false,
  });

  /** @type {ReturnType<typeof fastify.withTypeProvider<TypeBoxTypeProvider>>} */
  const app = fastify
    .setValidatorCompiler(TypeBoxValidatorCompiler)
    .withTypeProvider();

  app.get("/healthz", async () => ({ ok: true }));
  app.get("/readyz", async (_, reply) => {
    try {
      await pool.query("SELECT 1");
      return reply.code(200).send({ ok: true });
    } catch {
      return reply.code(503).send({ ok: false });
    }
  });

  await app.register(jwks);
  await app.register(auth, { pool });

  return app;
}
