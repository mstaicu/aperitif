import { TypeBoxValidatorCompiler } from "@fastify/type-provider-typebox";
import Fastify from "fastify";

import jwksRoutes from "./routes/jwks.mjs";
import probes from "./routes/probes.mjs";
import problemDetails from "./routes/problem-details.mjs";
import { registerV1Routes } from "./routes/v1/index.mjs";

/**
 * @typedef {import("fastify")} Fastify
 * @typedef {import("@fastify/otel").FastifyOtelInstrumentation} FastifyOtelInstrumentation
 * @typedef {import('./services/operators/index.mjs').OperatorsService} OperatorsService
 * @typedef {import('./services/passkeys/index.mjs').PasskeysService} PasskeysService
 * @typedef {import('./services/sessions/index.mjs').SessionsService} SessionsService
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
 *  jwks: import("./platform/security/index.mjs").JwtKeys["jwks"],
 *  operators: OperatorsService,
 *  passkeys: PasskeysService,
 *  sessions: SessionsService,
 *  fastifyOtel?: FastifyOtelInstrumentation
 * }} args
 * @returns {Promise<FastifyInstance>}
 */
export const createApp = async ({
  fastifyOtel,
  jwks,
  operators,
  passkeys,
  pool,
  sessions,
}) => {
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
  await app.register(jwksRoutes, { jwks });
  await registerV1Routes(app, {
    jwks,
    operators,
    passkeys,
    sessions,
  });

  return app;
};
