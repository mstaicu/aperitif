import { connection } from "../models/index.mjs";
import { metrics } from "../utils/metrics.mjs";

export var availability = (req, res, next) => {
  var { dbConnectionAttempts } = metrics;

  if (connection && connection.readyState === 1) {
    dbConnectionAttempts.inc({ status: "success" });

    return next();
  }

  dbConnectionAttempts.inc({ status: "failure" });

  return res.status(503).json({
    detail: "The database connection is not ready yet. Please try again later.",
    instance: req.originalUrl,
    status: 503,
    title: "Service Unavailable",
    type: "https://example.com/probs/db-not-ready",
  });
};
