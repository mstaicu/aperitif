import { TypeBoxValidatorCompiler } from "@fastify/type-provider-typebox";
import Fastify from "fastify";

import probes from "./api/probes/index.mjs";
import v1 from "./api/versions/v1/index.mjs";

/**
 * @typedef {import("fastify")} Fastify
 * @typedef {import("@fastify/otel").FastifyOtelInstrumentation} FastifyOtelInstrumentation
 *
 * @typedef {import('./context.mjs').Context} Ctx
 * @typedef {import('./runtime/index.mjs').Runtime} Runtime
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
 *  runtime: Runtime,
 *  fastifyOtel: FastifyOtelInstrumentation
 * }} args
 * @returns {Promise<FastifyInstance>}
 */
export const createApp = async ({ ctx, fastifyOtel, runtime }) => {
  const fastify = Fastify({
    logger: {
      level: "debug",
    },
  });

  /**
   * @type {FastifyInstance}
   */
  const app = fastify
    .setValidatorCompiler(TypeBoxValidatorCompiler)
    .withTypeProvider();

  await app.register(fastifyOtel.plugin());
  await app.register(probes, { db: ctx.data.db });
  await app.register(v1, { jwks: ctx.security.jwks, prefix: "/v1", runtime });

  return app;
};
