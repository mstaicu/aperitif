import { TypeBoxValidatorCompiler } from "@fastify/type-provider-typebox";
import Fastify from "fastify";

import probes from "./api/probes/index.mjs";
import requestProblemDetails from "./api/shared/request-problem-details.mjs";
import v1 from "./api/versions/v1/index.mjs";

/**
 * @typedef {import("fastify")} Fastify
 * @typedef {import("@fastify/otel").FastifyOtelInstrumentation} FastifyOtelInstrumentation
 * @typedef {import('./services/products/index.mjs').ProductsService} ProductsService
 * @typedef {import('./services/tenant-features/index.mjs').TenantFeaturesService} TenantFeaturesService
 *
 * @typedef {import('./platform/context.mjs').Context} Ctx
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
 *  ctx: Ctx,
 *  services: {
 *    products: ProductsService,
 *    tenantFeatures: TenantFeaturesService,
 *  },
 *  fastifyOtel?: FastifyOtelInstrumentation
 * }} args
 * @returns {Promise<FastifyInstance>}
 */
export const createApp = async ({ ctx, fastifyOtel, services }) => {
  /**
   * @type {FastifyInstance}
   */
  const app = Fastify({
    logger: {
      level: "debug",
    },
  })
    .setValidatorCompiler(TypeBoxValidatorCompiler)
    .withTypeProvider();

  await app.register(requestProblemDetails);
  if (fastifyOtel) {
    await app.register(fastifyOtel.plugin());
  }
  await app.register(probes, { db: ctx.persistence.db });
  await app.register(v1, { jwks: ctx.security.jwks, prefix: "/v1", services });

  return app;
};
