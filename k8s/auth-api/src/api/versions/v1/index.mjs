import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import fp from "fastify-plugin";
import nconf from "nconf";

import { routes as jwks } from "./routes/jwks/index.mjs";
import { routes as passkeys } from "./routes/passkeys/index.mjs";

const { origin } = new URL(nconf.get("ORIGIN"));

export const v1 = fp(async (fastify) => {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "Authentication",
        version: "v1",
      },
      servers: [
        {
          url: `${origin}/auth`,
        },
      ],
    },
  });

  await fastify.register(swaggerUI, {
    routePrefix: "/docs/v1",
  });

  await fastify.register(passkeys);
  await fastify.register(jwks);
});
