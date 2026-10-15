import { TypeBoxValidatorCompiler } from "@fastify/type-provider-typebox";
import Fastify, { LogController } from "fastify";
import { createLocalJWKSet } from "jose";

import jwksRoutes from "./routes/jwks.mjs";
import probes from "./routes/probes.mjs";
import configureProblemDetails from "./routes/problem-details.mjs";
import v1 from "./routes/v1/index.mjs";

/**
 * @param {{
 *   pool: import("pg").Pool,
 *   origin: string,
 *   jwt: import("./jwks.mjs").JwtKeys,
 * }} dependencies
 */
export function buildApp({ jwt: { jwks, signingKey }, origin, pool }) {
  const app = Fastify({
    logController: new LogController({ disableRequestLogging: true }),
    logger: true,
  }).setValidatorCompiler(TypeBoxValidatorCompiler);

  configureProblemDetails(app);

  app.register(probes, { pool });
  app.register(jwksRoutes, { jwks });
  app.register(v1, {
    jwks: createLocalJWKSet(jwks),
    origin,
    pool,
    prefix: "/v1",
    signingKey,
  });

  return app;
}
