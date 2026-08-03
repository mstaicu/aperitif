import { TypeBoxValidatorCompiler } from "@fastify/type-provider-typebox";
import Fastify from "fastify";

import probes from "./routes/probes.mjs";
import problemDetails from "./routes/problem-details.mjs";
import { registerV1Routes } from "./routes/v1/index.mjs";

/**
 * @typedef {import("fastify")} Fastify
 * @typedef {import("@fastify/otel").FastifyOtelInstrumentation} FastifyOtelInstrumentation
 * @typedef {import('./services/accounts/index.mjs').AccountsService} AccountsService
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
 *  jwks: import("jose").JWTVerifyGetKey,
 *  accounts: AccountsService,
 *  fastifyOtel?: FastifyOtelInstrumentation
 * }} args
 * @returns {Promise<FastifyInstance>}
 */
export const createApp = async ({ accounts, fastifyOtel, jwks, pool }) => {
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
    accounts,
    jwks,
  });

  return app;
};
