import { metrics } from "../utils/metrics.mjs";

var EXCLUDED_PATHS = [
  "/healthz",
  "/readyz",
  "/metrics",
  "/.well-known/jwks.json",
];

/**
 *
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @param {import("express").NextFunction} next - Express next middleware function
 */
export var prometheus = (req, res, next) => {
  if (EXCLUDED_PATHS.includes(req.path.toLowerCase())) {
    return next();
  }

  var { activeConnections, httpRequestDuration, httpRequestTotal } = metrics;

  var routePath = req.route ? req.route.path : req.path;

  var end = httpRequestDuration.startTimer({
    method: req.method,
    route: routePath,
  });

  activeConnections.inc();

  res.once("finish", () => {
    httpRequestTotal.inc({
      method: req.method,
      route: routePath,
      status: res.statusCode,
    });

    end({ status: res.statusCode });

    activeConnections.dec();
  });

  next();
};
