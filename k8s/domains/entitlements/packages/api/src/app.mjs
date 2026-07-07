import { TypeBoxValidatorCompiler } from "@fastify/type-provider-typebox";
import Fastify from "fastify";

import probes from "./api/probes.mjs";
import problemDetails from "./api/problem-details.mjs";
import { registerV1Routes } from "./routes/v1/index.mjs";

/**
 * @typedef {import("fastify")} Fastify
 * @typedef {import("@fastify/otel").FastifyOtelInstrumentation} FastifyOtelInstrumentation
 * @typedef {import('./services/entitlements/index.mjs').EntitlementsService} EntitlementsService
 * @typedef {import('./services/account-entitlements/index.mjs').AccountEntitlementsService} AccountEntitlementsService
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
 *  db: import("pg").Pool,
 *  jwks: import("./platform/security/index.mjs").IdentityJwks,
 *  accountEntitlements: AccountEntitlementsService,
 *  entitlements: EntitlementsService,
 *  fastifyOtel?: FastifyOtelInstrumentation
 * }} args
 * @returns {Promise<FastifyInstance>}
 */
export const createApp = async ({
  accountEntitlements,
  db,
  entitlements,
  fastifyOtel,
  jwks,
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
  await app.register(probes, { db });
  await registerV1Routes(app, {
    accountEntitlements,
    entitlements,
    jwks,
    prefix: "/v1",
  });

  return app;
};
