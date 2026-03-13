import { TypeBoxValidatorCompiler } from "@fastify/type-provider-typebox";
import Fastify from "fastify";

import { pgPlugin, probesPlugin } from "./plugins/index.mjs";
import { routes as auth } from "./routes/auth.mjs";
import { routes as jwks } from "./routes/jwks.mjs";

const fastify = Fastify({
  bodyLimit: 64 * 1024,
  keepAliveTimeout: 5_000,
  logger: {
    enabled: true,
    level: "debug",
  },
  requestTimeout: 10_000,
  // Only enable if you explicitly trust Traefik subnet
  // APIs are reachable from public and private
  // Public via Cloudflare -> Traefik -> APIs
  // Private via Cloudflare -> Traefik -> SSR loaders -> APIs
  // We need to trust and forward XFF headers for these two scenarios
  // To do anything useful with the client IP
  trustProxy: false,
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
await app.register(auth);

export { app };
