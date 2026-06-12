import { TypeBoxValidatorCompiler } from "@fastify/type-provider-typebox";
import Fastify from "fastify";

import jwks from "./api/jwks.mjs";
import probes from "./api/probes.mjs";
import problemDetails from "./api/problem-details.mjs";
import v1 from "./api/versions/v1/index.mjs";

/**
 * @typedef {import("fastify")} Fastify
 * @typedef {import("@fastify/otel").FastifyOtelInstrumentation} FastifyOtelInstrumentation
 * @typedef {import('./services/operators/index.mjs').OperatorsService} OperatorsService
 * @typedef {import('./services/passkeys/index.mjs').PasskeysService} PasskeysService
 * @typedef {import('./services/sessions/index.mjs').SessionsService} SessionsService
 *
 * @typedef {import('./platform/runtime.mjs').Runtime} Runtime
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
 *  runtime: Runtime,
 *  services: {
 *    operators: OperatorsService,
 *    passkeys: PasskeysService,
 *    sessions: SessionsService,
 *  },
 *  fastifyOtel?: FastifyOtelInstrumentation
 * }} args
 * @returns {Promise<FastifyInstance>}
 */
export const createApp = async ({ fastifyOtel, runtime, services }) => {
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
  await app.register(probes, { db: runtime.db });
  await app.register(jwks, { jwks: runtime.security.jwks });
  await app.register(v1, {
    prefix: "/v1",
    security: runtime.security,
    services,
  });

  return app;
};
