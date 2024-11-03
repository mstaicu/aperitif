import { connection } from "../models/index.mjs";
import { metrics } from "../utils/metrics.mjs";

/**
 * Middleware to check the availability of the database service.
 * If the database connection is not ready,
 * it responds with a 503 error using RFC 7807 Problem Details.
 *
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @param {import("express").NextFunction} next - Express next middleware function
 */
export var availability = (req, res, next) => {
  var { dbConnectionAttempts } = metrics;

  if (connection && connection.readyState === 1) {
    dbConnectionAttempts.inc({ status: "success" });

    return next();
  }

  dbConnectionAttempts.inc({ status: "failure" });

  /**
   * Use RFC 7807 Problem Details to return structured error response
   */
  return res.status(503).json({
    detail: "The database connection is not ready yet. Please try again later.",
    instance: req.originalUrl,
    status: 503,
    title: "Service Unavailable",
    type: "https://example.com/probs/db-not-ready",
  });
};
