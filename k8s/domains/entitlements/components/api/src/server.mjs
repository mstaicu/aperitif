import { TypeBoxValidatorCompiler } from "@fastify/type-provider-typebox";
import Fastify from "fastify";
import { createRemoteJWKSet } from "jose";
import { once } from "node:events";
import process from "node:process";
import { Pool } from "pg";

import problemDetails from "./platform/problem-details.mjs";
import probes from "./routes/probes.mjs";
import { registerV1Routes } from "./routes/v1/index.mjs";
import { getGrantsService } from "./services/grants/index.mjs";

/**
 * @typedef {Fastify.FastifyInstance<
 *   Fastify.RawServerDefault,
 *   Fastify.RawRequestDefaultExpression,
 *   Fastify.RawReplyDefaultExpression,
 *   Fastify.FastifyBaseLogger,
 *   import("@fastify/type-provider-typebox").TypeBoxTypeProvider
 * >} FastifyInstance
 */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => console.error(err));

const jwks = createRemoteJWKSet(
  new URL(/** @type {string} */ (process.env.IDENTITY_JWKS_URL)),
);
const grants = getGrantsService({ pool });

/** @type {FastifyInstance} */
await using app = Fastify({ logger: true })
  .setValidatorCompiler(TypeBoxValidatorCompiler)
  .withTypeProvider();

app.addHook("onClose", () => pool.end());

await app.register(problemDetails);
await app.register(probes, { pool });
await registerV1Routes(app, {
  grants,
  jwks,
});

await app.listen({ host: "0.0.0.0", port: 3000 });

const [signal] = await Promise.race(
  ["SIGINT", "SIGTERM", "SIGUSR2"].map((code) => once(process, code)),
);

app.log.info({ signal }, "closing server");
