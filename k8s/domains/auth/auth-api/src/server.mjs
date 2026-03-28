import { TypeBoxValidatorCompiler } from "@fastify/type-provider-typebox";
import Fastify from "fastify";

import jwks from "./api/jwks/index.mjs";
import probes from "./api/probes/index.mjs";
import v1 from "./api/versions/v1/index.mjs";
import { createContext } from "./context.mjs";
import { createRuntime } from "./runtime/index.mjs";

const ctx = await createContext();
const runtime = createRuntime(ctx);

const fastify = Fastify({
  logger: {
    level: "debug",
  },
});

/**
 * @type {import('./fastify.js').FastifyInstance}
 */
const app = fastify
  .setValidatorCompiler(TypeBoxValidatorCompiler)
  .withTypeProvider();

await app.register(probes, { ctx });
await app.register(jwks);
await app.register(v1, { prefix: "/v1", runtime });

app.addHook("onClose", () => ctx.close());

await app.ready();

await app.listen({
  port: 3000,
});
