import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import fp from "fastify-plugin";

import { routes } from "../routes/auth.v1.mjs";

export const v1 = fp(async (fastify) => {
  await fastify.register(swagger, {
    openapi: {
      info: {
        description: "Passkey authentication domain",
        title: "Authentication",
        version: "1.0.0",
      },
      servers: [
        {
          description: "Production server",
          url: "https://tma.com/auth",
        },
      ],
    },
  });

  await fastify.register(swaggerUI, {
    indexPrefix: "/auth",
    routePrefix: "/docs/v1",
  });

  await fastify.register(routes);
});
