import { TypeBoxValidatorCompiler } from "@fastify/type-provider-typebox";
import Fastify from "fastify";
import { once } from "node:events";
import process from "node:process";
import { Pool } from "pg";

import { createJwtKeys } from "./platform/jwt-keys.mjs";
import problemDetails from "./platform/problem-details.mjs";
import jwksRoutes from "./routes/jwks.mjs";
import probes from "./routes/probes.mjs";
import { registerV1Routes } from "./routes/v1/index.mjs";
import { createOperatorsService } from "./services/operators/index.mjs";
import { createPasskeysService } from "./services/passkeys/index.mjs";
import { createSessionsService } from "./services/sessions/index.mjs";

/**
 * @typedef {import("fastify")} Fastify
 * @typedef {import('./services/operators/index.mjs').OperatorsService} OperatorsService
 * @typedef {import('./services/passkeys/index.mjs').PasskeysService} PasskeysService
 * @typedef {import('./services/sessions/index.mjs').SessionsService} SessionsService
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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => console.error(err));

const { jwks, signingKey } = await createJwtKeys();

const operators = createOperatorsService({ pool });
const passkeys = createPasskeysService({
  origin: /** @type {string} */ (process.env.ORIGIN),
  pool,
});
const sessions = createSessionsService({
  pool,
  signingKey,
});

/** @type {FastifyInstance} */
await using app = Fastify({ logger: true })
  .setValidatorCompiler(TypeBoxValidatorCompiler)
  .withTypeProvider();

app.addHook("onClose", () => pool.end());

await app.register(problemDetails);
await app.register(probes, { pool });
await app.register(jwksRoutes, { jwks });
await registerV1Routes(app, {
  jwks,
  operators,
  passkeys,
  sessions,
});

await app.listen({ host: "0.0.0.0", port: 3000 });

const [signal] = await Promise.race(
  ["SIGINT", "SIGTERM", "SIGUSR2"].map((code) => once(process, code)),
);

app.log.info({ signal }, "closing server");
