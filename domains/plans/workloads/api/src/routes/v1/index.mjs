import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

/**
 * @type {import("@fastify/type-provider-typebox").FastifyPluginAsyncTypebox}
 */
export default async function v1(fastify) {
  await fastify.register(swagger, {
    openapi: {
      info: {
        description: "Plans API.",
        title: "Plans",
        version: "v1",
      },
      servers: [
        {
          url: "/",
        },
      ],
    },
  });

  await fastify.register(swaggerUI, {
    indexPrefix: "/v1",
    routePrefix: "/plans/docs",
  });
}
