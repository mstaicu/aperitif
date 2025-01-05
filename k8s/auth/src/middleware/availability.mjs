// @ts-check
import { connection } from "../models/index.mjs";

/**
 *
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @param {import("express").NextFunction} next - Express next middleware function
 */
export var availability = (req, res, next) => {
  if (connection && connection.readyState === 1) {
    return next();
  }

  res.status(503).json({
    instance: req.originalUrl,
    status: 503,
    title: "Service Unavailable",
  });
};
