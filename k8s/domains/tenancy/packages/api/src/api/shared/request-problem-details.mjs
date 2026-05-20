import fp from "fastify-plugin";

const VALIDATION_CONTEXTS = new Set(["body", "params", "query", "querystring"]);

/** @type {Record<string, { status: number, title: string, type: string }>} */
const PROBLEMS = {
  DATABASE_UNAVAILABLE: {
    status: 503,
    title: "Database unavailable",
    type: "/problems/database-unavailable",
  },
  FORBIDDEN: {
    status: 403,
    title: "Forbidden",
    type: "/problems/forbidden",
  },
  INVALID_ACCESS_TOKEN: {
    status: 401,
    title: "Invalid access token",
    type: "/problems/invalid-access-token",
  },
  TENANT_NOT_FOUND: {
    status: 404,
    title: "Tenant not found",
    type: "/problems/tenant-not-found",
  },
};

/**
 * Normalize request-layer and known application/domain failures to Problem Details.
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

    const problem = PROBLEMS[err.code || err.message];

    if (problem) {
      return reply.type("application/problem+json").code(problem.status).send({
        status: problem.status,
        title: problem.title,
        type: problem.type,
      });
    }

    if (typeof status === "number" && status >= 400 && status < 500) {
      return reply.type("application/problem+json").code(status).send({
        status,
        title: "Request rejected",
        type: "/problems/request-rejected",
      });
    }

    return reply.type("application/problem+json").code(500).send({
      status: 500,
      title: "Internal server error",
      type: "/problems/internal-server-error",
    });
  };

  fastify.setErrorHandler(onError);
});
