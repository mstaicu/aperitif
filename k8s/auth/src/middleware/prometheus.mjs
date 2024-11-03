import { metrics } from "../utils/metrics.js";

/**
 *
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @param {import("express").NextFunction} next - Express next middleware function
 */
export var prometheus = (req, res, next) => {
  const { activeConnections, httpRequestDuration, httpRequestTotal } = metrics;

  const end = httpRequestDuration.startTimer({
    method: req.method,
    route: req.route ? req.route.path : req.path,
  });

  httpRequestTotal.inc({
    method: req.method,
    route: req.route ? req.route.path : req.path,
    status: res.statusCode,
  });

  activeConnections.inc();

  res.on("finish", () => {
    end({ status: res.statusCode });

    activeConnections.dec();
  });

  next();
};
