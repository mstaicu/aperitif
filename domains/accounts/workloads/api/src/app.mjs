import { TypeBoxValidatorCompiler } from "@fastify/type-provider-typebox";
import Fastify, { LogController } from "fastify";

import configureProblemDetails from "./platform/problem-details.mjs";
import probes from "./routes/probes.mjs";
import v1 from "./routes/v1/index.mjs";

/**
 * @param {{
 *   pool: import("pg").Pool,
 *   jwks: import("jose").JWTVerifyGetKey,
 * }} dependencies
 */
export function buildApp({ jwks, pool }) {
  const app = Fastify({
    logController: new LogController({ disableRequestLogging: true }),
    logger: true,
  }).setValidatorCompiler(TypeBoxValidatorCompiler);

  configureProblemDetails(app);
  app.register(probes, { pool });
  app.register(v1, {
    jwks,
    pool,
    prefix: "/v1",
  });

  return app;
}
