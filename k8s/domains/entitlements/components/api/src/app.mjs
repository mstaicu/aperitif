import { TypeBoxValidatorCompiler } from "@fastify/type-provider-typebox";
import Fastify from "fastify";

import probes from "./routes/probes.mjs";
import problemDetails from "./routes/problem-details.mjs";
import { registerV1Routes } from "./routes/v1/index.mjs";

/**
 * @typedef {import("fastify")} Fastify
 * @typedef {import("@fastify/otel").FastifyOtelInstrumentation} FastifyOtelInstrumentation
 * @typedef {import('./services/grants/index.mjs').GrantsService} GrantsService
 */

/**
 * @typedef {Fastify.FastifyInstance<
 *   Fastify.RawServerDefault,
 *   Fastify.RawRequestDefaultExpression,
 *   Fastify.RawReplyDefaultExpression,
 *   Fastify.FastifyBaseLogger,
 *   import("@fastify/type-provider-typebox").TypeBoxTypeProvider
 * >} FastifyInstance
 */

/**
 * @param {{
 *  pool: import("pg").Pool,
 *  fastifyOtel?: FastifyOtelInstrumentation,
 *  grants: GrantsService,
 *  jwks: import("jose").JWTVerifyGetKey,
 * }} args
 * @returns {Promise<FastifyInstance>}
 */
export const createApp = async ({ fastifyOtel, grants, jwks, pool }) => {
  /**
   * @type {FastifyInstance}
   */
  const app = Fastify()
    .setValidatorCompiler(TypeBoxValidatorCompiler)
    .withTypeProvider();

  await app.register(problemDetails);
  if (fastifyOtel) {
    await app.register(fastifyOtel.plugin());
  }
  await app.register(probes, { pool });
  await registerV1Routes(app, {
    grants,
    jwks,
  });

  return app;
};
