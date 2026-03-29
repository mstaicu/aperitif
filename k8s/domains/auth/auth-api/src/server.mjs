import { TypeBoxValidatorCompiler } from "@fastify/type-provider-typebox";
import Fastify from "fastify";

import jwks from "./api/jwks/index.mjs";
import probes from "./api/probes/index.mjs";
import v1 from "./api/versions/v1/index.mjs";
import { createContext } from "./context.mjs";
import { createRuntime } from "./runtime/index.mjs";

/**
 * @typedef {import("fastify")} Fastify
 * @typedef {import("@fastify/type-provider-typebox").TypeBoxTypeProvider} TypeBoxTypeProvider
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

const ctx = await createContext();
const runtime = createRuntime(ctx);

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

await app.register(probes, { ctx });
await app.register(jwks, { ctx });
await app.register(v1, { prefix: "/v1", runtime });

app.addHook("onClose", () => ctx.close());

await app.ready();

await app.listen({
  port: 3000,
});
