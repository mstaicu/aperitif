import { TypeBoxValidatorCompiler } from "@fastify/type-provider-typebox";
import Fastify from "fastify";

import { pgPlugin, probesPlugin, v1 } from "./plugins/index.mjs";
import { routes as jwks } from "./routes/jwks.mjs";

const fastify = Fastify({
  logger: {
    enabled: true,
    level: "debug",
  },
});

/**
 * @type {import('./fastify.js').Instance}
 */
const app = fastify
  .setValidatorCompiler(TypeBoxValidatorCompiler)
  .withTypeProvider();

await app.register(pgPlugin);
// await app.register(natsPlugin);
await app.register(probesPlugin);

await app.register(jwks);
await app.register(v1);

export { app };
