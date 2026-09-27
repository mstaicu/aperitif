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
 *   jwt: import("./platform/jwt-keys.mjs").JwtKeys,
 * }} dependencies
 */
export function buildApp({ jwt: { jwks, signingKey }, origin, pool }) {
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
