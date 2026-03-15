import { TypeBoxValidatorCompiler } from "@fastify/type-provider-typebox";
import Fastify from "fastify";

import { v1 } from "./api/versions/v1/index.mjs";
import { pgPlugin, probesPlugin } from "./plugins/index.mjs";

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

await app.register(v1);

export { app };
