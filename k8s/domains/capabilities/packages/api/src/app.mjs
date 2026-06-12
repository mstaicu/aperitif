import { TypeBoxValidatorCompiler } from "@fastify/type-provider-typebox";
import Fastify from "fastify";

import probes from "./api/probes/index.mjs";
import problemDetails from "./api/problem-details.mjs";
import v1 from "./api/versions/v1/index.mjs";

/**
 * @typedef {import("fastify")} Fastify
 * @typedef {import("@fastify/otel").FastifyOtelInstrumentation} FastifyOtelInstrumentation
 * @typedef {import('./services/capabilities/index.mjs').CapabilitiesService} CapabilitiesService
 * @typedef {import('./services/account-capabilities/index.mjs').AccountCapabilitiesService} AccountCapabilitiesService
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
 *    capabilities: CapabilitiesService,
 *    accountCapabilities: AccountCapabilitiesService,
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
  await app.register(v1, {
    jwks: runtime.security.jwks,
    prefix: "/v1",
    services,
  });

  return app;
};
