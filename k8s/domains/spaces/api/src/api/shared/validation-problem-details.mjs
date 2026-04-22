import fp from "fastify-plugin";

/**
 * @typedef {{
 *   message?: string,
 *   validation?: unknown,
 *   validationContext?: string,
 * }} ValidationErrorLike
 */

const VALIDATION_CONTEXTS = new Set(["body", "params", "query", "querystring"]);

/**
 * Normalize Fastify body, params, and query validation failures to Problem Details.
 * All non-validation errors and all other Fastify errors are re-thrown to Fastify's default error handling.
 */
export default fp(async function validationProblemDetails(fastify) {
  fastify.setErrorHandler((err, _, reply) => {
    const error = /** @type {ValidationErrorLike} */ (err);

    if (
      !error.validation ||
      !VALIDATION_CONTEXTS.has(error.validationContext ?? "")
    ) {
      throw err;
    }

    return reply
      .type("application/problem+json")
      .code(400)
      .send({
        ...(error.message ? { detail: error.message } : {}),
        status: 400,
        title: "Invalid request",
        type: "/problems/invalid-request",
      });
  });
});
