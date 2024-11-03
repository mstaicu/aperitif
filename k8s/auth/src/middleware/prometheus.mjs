import { metrics } from "../utils/metrics.mjs";

/**
 *
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @param {import("express").NextFunction} next - Express next middleware function
 */
export var prometheus = (req, res, next) => {
  if (req.path === "/healthz" || req.path === "/readyz") {
    return next();
  }

  var { activeConnections, httpRequestDuration, httpRequestTotal } = metrics;

  var end = httpRequestDuration.startTimer({
    method: req.method,
    route: req.route ? req.route.path : req.path,
  });

  activeConnections.inc();

  res.on("finish", () => {
    httpRequestTotal.inc({
      method: req.method,
      route: req.route ? req.route.path : req.path,
      status: res.statusCode,
    });

    end({ status: res.statusCode });

    activeConnections.dec();
  });

  next();
};
