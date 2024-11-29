// @ts-check
import { Router } from "express";

import { availability, prometheus } from "../middleware/index.mjs";
import { healthRouter, jwksRouter, metricsRouter } from "./public/index.mjs";

const router = Router();

router.use("/", healthRouter);
router.use("/", metricsRouter);
router.use("/", jwksRouter);

router.use(prometheus);
router.use(availability);

export { router };
