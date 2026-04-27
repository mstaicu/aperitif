import { TypeBoxValidatorCompiler } from "@fastify/type-provider-typebox";
import Fastify from "fastify";

import probes from "./api/probes/index.mjs";
import requestProblemDetails from "./api/shared/request-problem-details.mjs";
import v1 from "./api/versions/v1/index.mjs";

/**
 * @typedef {import("fastify")} Fastify
 * @typedef {import("@fastify/otel").FastifyOtelInstrumentation} FastifyOtelInstrumentation
 * @typedef {import('./domains/spaces/index.mjs').SpacesDomain} SpacesDomain
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
 *  domains: {
 *    spaces: SpacesDomain,
 *  },
 *  fastifyOtel: FastifyOtelInstrumentation
 * }} args
 * @returns {Promise<FastifyInstance>}
 */
export const createApp = async ({ ctx, domains, fastifyOtel }) => {
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
  await app.register(fastifyOtel.plugin());
  await app.register(probes, { db: ctx.persistence.db });
  await app.register(v1, { domains, jwks: ctx.security.jwks, prefix: "/v1" });

  return app;
};
