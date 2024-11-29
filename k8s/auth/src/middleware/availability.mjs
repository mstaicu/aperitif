import { connection } from "../models/index.mjs";
import { metrics } from "../utils/metrics.mjs";

/**
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

  res.status(503).json({
    instance: req.originalUrl,
    status: 503,
    title: "Service Unavailable",
  });
};
