import fp from "fastify-plugin";

const VALIDATION_CONTEXTS = new Set(["body", "params", "query", "querystring"]);

/** @type {Record<string, { status: number, title: string, type: string }>} */
const PROBLEMS = {
  AUTHENTICATION_FAILED: {
    status: 401,
    title: "Authentication failed",
    type: "/problems/authentication-failed",
  },
  CREDENTIAL_ALREADY_EXISTS: {
    status: 409,
    title: "Passkey already exists",
    type: "/problems/credential-already-exists",
  },
  DATABASE_UNAVAILABLE: {
    status: 503,
    title: "Database unavailable",
    type: "/problems/database-unavailable",
  },
  INVALID_AUTHENTICATION_RESPONSE: {
    status: 400,
    title: "Invalid authentication response",
    type: "/problems/invalid-authentication-response",
  },
  INVALID_AUTHORIZATION_HEADER: {
    status: 401,
    title: "Invalid authorization header",
    type: "/problems/invalid-authorization-header",
  },
  INVALID_REFRESH_TOKEN: {
    status: 401,
    title: "Invalid refresh token",
    type: "/problems/invalid-refresh-token",
  },
  INVALID_REGISTRATION_RESPONSE: {
    status: 400,
    title: "Invalid registration response",
    type: "/problems/invalid-registration-response",
  },
  REGISTRATION_VERIFICATION_FAILED: {
    status: 401,
    title: "Registration verification failed",
    type: "/problems/registration-verification-failed",
  },
  SESSION_NOT_FOUND: {
    status: 401,
    title: "Invalid refresh token",
    type: "/problems/invalid-refresh-token",
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
