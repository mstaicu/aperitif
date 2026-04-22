import fp from "fastify-plugin";

const VALIDATION_CONTEXTS = new Set(["body", "params", "query", "querystring"]);

/**
 * Normalize Fastify request-layer failures to Problem Details.
 * Domain and application errors stay owned by the routes.
 */
export default fp(async function requestProblemDetails(fastify) {
  fastify.setNotFoundHandler((_, reply) =>
    reply.type("application/problem+json").code(404).send({
      status: 404,
      title: "Route not found",
      type: "/problems/route-not-found",
    }),
  );

  /**
   * @param {import("fastify").FastifyError} err
   * @param {import("fastify").FastifyRequest} _
   * @param {import("fastify").FastifyReply} reply
   */
  const onError = (err, _, reply) => {
    const status = err.statusCode;
    const isValidationError =
      !!err.validation && VALIDATION_CONTEXTS.has(err.validationContext ?? "");

    if (isValidationError) {
      return reply.type("application/problem+json").code(400).send({
        status: 400,
        title: "Invalid request",
        type: "/problems/invalid-request",
      });
    }

    if (typeof status !== "number" || status < 400 || status >= 500) {
      throw err;
    }

    return reply.type("application/problem+json").code(status).send({
      status,
      title: "Request rejected",
      type: "/problems/request-rejected",
    });
  };

  fastify.setErrorHandler(onError);
});
