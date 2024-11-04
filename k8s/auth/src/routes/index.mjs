import express from "express";

import { availability, prometheus } from "../middleware/index.mjs";
import { healthRouter } from "./health.mjs";
import { metricsRouter } from "./metrics.mjs";

const router = express.Router();

/**
 * non-business routes that are always accessible
 */
router.use("/", healthRouter);
router.use("/", metricsRouter);

/**
 * apply 'prometheus' middleware to track only business-related requests
 */
router.use(prometheus);

/**
 * apply 'availability' middleware to ensure database connectivity for business routes
 */
router.use(availability);

/**
 * business-related routes that depend on the database go here
 */
// router.use("/users", userRouter);

export { router };
