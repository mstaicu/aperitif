import { Type } from "@sinclair/typebox";
import fp from "fastify-plugin";

const PROBLEM_CONTENT_TYPE = "application/problem+json";

/** @typedef {import("fastify").FastifyError & { validation?: unknown }} ProblemError */

export const ErrorResponse = Type.Object(
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
      schema: ErrorResponse,
    },
  },
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
  USER_NOT_FOUND: {
    status: 404,
    title: "User not found",
    type: "/problems/user-not-found",
  },
};

export default fp(async function (app) {
  app.setNotFoundHandler((_, reply) =>
    reply
      .type(PROBLEM_CONTENT_TYPE)
      .code(ROUTE_NOT_FOUND.status)
      .send(ROUTE_NOT_FOUND),
  );

  app.setErrorHandler((err, _, reply) => {
    const error = /** @type {ProblemError} */ (err);

    if (error.validation) {
      return reply
        .type(PROBLEM_CONTENT_TYPE)
        .code(INVALID_REQUEST.status)
        .send(INVALID_REQUEST);
    }

    const problem = PROBLEMS[error.code || error.message];

    if (problem) {
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

    return reply
      .type(PROBLEM_CONTENT_TYPE)
      .code(INTERNAL_SERVER_ERROR.status)
      .send(INTERNAL_SERVER_ERROR);
  });
});
