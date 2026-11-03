import { Type } from "@fastify/type-provider-typebox";
import createError from "http-errors";
import { STATUS_CODES } from "node:http";
import { DatabaseError } from "pg";

export const ErrorResponse = Type.Object(
  {
    error: Type.String(),
    message: Type.String(),
    statusCode: Type.Integer({ maximum: 599, minimum: 400 }),
  },
  { additionalProperties: false },
);

/**
 * @param {import("fastify").FastifyError} error
 * @param {import("fastify").FastifyRequest} request
 * @param {import("fastify").FastifyReply} reply
 */
export function errorHandler(error, request, reply) {
  let status = 500;

  if (error instanceof DatabaseError) {
    if (
      error.code?.startsWith("08") ||
      ["57P01", "57P03", "53300"].includes(error.code ?? "")
    ) {
      status = 503;
    }
  } else if (
    ["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT"].includes(error.code ?? "")
  ) {
    status = 503;
  } else if (
    typeof error.statusCode === "number" &&
    Number.isInteger(error.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode <= 599 &&
    STATUS_CODES[error.statusCode]
  ) {
    status = error.statusCode;
  }

  if (status === 401) reply.header("WWW-Authenticate", "Bearer");

  if (status >= 500) {
    request.log.error(
      error instanceof DatabaseError || status === 503
        ? { code: error.code, error: error.name }
        : { err: error },
      "request failed",
    );
  }

  const phrase = STATUS_CODES[status];

  return reply
    .header("Cache-Control", "no-store")
    .code(status)
    .send({
      error: phrase,
      message:
        status < 500 && createError.isHttpError(error) && error.expose
          ? error.message
          : phrase,
      statusCode: status,
    });
}

/**
 * @param {import("fastify").FastifyRequest} _request
 * @param {import("fastify").FastifyReply} reply
 */
export function notFoundHandler(_request, reply) {
  return reply.send(new createError.NotFound());
}
