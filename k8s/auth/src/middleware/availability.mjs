// @ts-check
import { nc } from "../messaging/index.mjs";
import { connection } from "../models/index.mjs";

/**
 *
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @param {import("express").NextFunction} next - Express next middleware function
 */
export var serviceAvailability = (req, res, next) => {
  var dbAvailable = connection && connection.readyState === 1;
  var ncAvailable = nc && !nc.isClosed();

  var serviceUnavailable = !dbAvailable || !ncAvailable;

  serviceUnavailable
    ? res.status(503).json({
        instance: req.originalUrl,
        status: 503,
        title: "Service Unavailable",
      })
    : next();
};
