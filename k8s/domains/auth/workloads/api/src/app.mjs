import { TypeBoxValidatorCompiler } from "@fastify/type-provider-typebox";
import Fastify, { LogController } from "fastify";

import problemDetails from "./platform/problem-details.mjs";
import jwksRoutes from "./routes/jwks.mjs";
import probes from "./routes/probes.mjs";
import v1 from "./routes/v1/index.mjs";

/**
 * @param {{
 *   pool: import("pg").Pool,
 *   origin: string,
 *   signingKey: import("./platform/jwt-keys.mjs").JwtKeys["signingKey"],
 *   jwks: import("jose").JSONWebKeySet,
 * }} dependencies
 */
export function buildApp({ jwks, origin, pool, signingKey }) {
  const app = Fastify({
    logController: new LogController({ disableRequestLogging: true }),
    logger: true,
  }).setValidatorCompiler(TypeBoxValidatorCompiler);

  app.register(problemDetails);
  app.register(probes, { pool });
  app.register(jwksRoutes, { jwks });
  app.register(v1, {
    origin,
    pool,
    prefix: "/v1",
    signingKey,
  });

  return app;
}
