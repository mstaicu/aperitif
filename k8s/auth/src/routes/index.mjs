import express from "express";

import { availability, prometheus } from "../middleware/index.mjs";
import { healthRouter } from "./health.mjs";
import { metricsRouter } from "./metrics.mjs";

const router = express.Router();

/**
 * Non-business routes, like /metrics, /healthz and /readyz
 * bypass the availability middleware and remain accessible for continuous monitoring
 */
router.use("/", healthRouter);

router.use(prometheus);
router.use("/", metricsRouter);

/**
 * Only requests that need the database connection are gated by the availability check.
 */
router.use(availability);

/**
 * Add business related routers here
 */

export { router };
