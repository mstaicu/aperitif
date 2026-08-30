import { Type } from "@fastify/type-provider-typebox";
import fp from "fastify-plugin";
import { DatabaseError } from "pg";

const PROBLEM_CONTENT_TYPE = "application/problem+json";

/** @typedef {import("fastify").FastifyError & { validation?: unknown }} ProblemError */

const ProblemDetails = Type.Object(
  {
    status: Type.Integer({ maximum: 599, minimum: 400 }),
    title: Type.String({ minLength: 1 }),
    type: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const ProblemResponse = {
  content: {
    [PROBLEM_CONTENT_TYPE]: {
      schema: ProblemDetails,
    },
  },
  description: "Problem details response.",
};

const ROUTE_NOT_FOUND = {
  status: 404,
  title: "Route not found",
  type: "/problems/route-not-found",
};

const INVALID_REQUEST = {
  status: 400,
  title: "Invalid request",
  type: "/problems/invalid-request",
};

const REQUEST_REJECTED = {
  status: 400,
  title: "Request rejected",
  type: "/problems/request-rejected",
};

const INTERNAL_SERVER_ERROR = {
  status: 500,
  title: "Internal server error",
  type: "/problems/internal-server-error",
};

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
  INVALID_REGISTRATION_RESPONSE: {
    status: 400,
    title: "Invalid registration response",
    type: "/problems/invalid-registration-response",
  },
  INVALID_SESSION_TOKEN: {
    status: 401,
    title: "Invalid session token",
    type: "/problems/invalid-session-token",
  },
  REGISTRATION_VERIFICATION_FAILED: {
    status: 401,
    title: "Registration verification failed",
    type: "/problems/registration-verification-failed",
  },
  SESSION_NOT_FOUND: {
    status: 401,
    title: "Invalid session token",
    type: "/problems/invalid-session-token",
  },
  USER_ALREADY_REGISTERED: {
    status: 409,
    title: "User already registered",
    type: "/problems/user-already-registered",
  },
};

export default fp(async function (app) {
  app.setNotFoundHandler((_, reply) =>
    reply
      .type(PROBLEM_CONTENT_TYPE)
      .code(ROUTE_NOT_FOUND.status)
      .send(ROUTE_NOT_FOUND),
  );

  app.setErrorHandler((err, request, reply) => {
    const error = /** @type {ProblemError} */ (err);

    if (error.validation) {
      return reply
        .type(PROBLEM_CONTENT_TYPE)
        .code(INVALID_REQUEST.status)
        .send(INVALID_REQUEST);
    }

    const databaseUnavailable =
      (error instanceof DatabaseError &&
        (error.code?.startsWith("08") ||
          error.code === "57P01" ||
          error.code === "57P03" ||
          error.code === "53300")) ||
      (Error.isError(error) &&
        "code" in error &&
        "syscall" in error &&
        typeof error.code === "string");

    const problem = databaseUnavailable
      ? PROBLEMS.DATABASE_UNAVAILABLE
      : Error.isError(error)
        ? PROBLEMS[error.message]
        : undefined;

    if (problem) {
      if (problem.status >= 500) {
        request.log.error({ err: error }, "request failed");
      }

      return reply
        .type(PROBLEM_CONTENT_TYPE)
        .code(problem.status)
        .send(problem);
    }

    const status = error.statusCode;

    if (typeof status === "number" && status >= 400 && status < 500) {
      return reply
        .type(PROBLEM_CONTENT_TYPE)
        .code(status)
        .send({
          ...REQUEST_REJECTED,
          status,
        });
    }

    request.log.error({ err: error }, "request failed");

    return reply
      .type(PROBLEM_CONTENT_TYPE)
      .code(INTERNAL_SERVER_ERROR.status)
      .send(INTERNAL_SERVER_ERROR);
  });
});
