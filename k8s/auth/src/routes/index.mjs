// @ts-check
import { Router } from "express";

import { availability } from "../middleware/index.mjs";
import { healthRouter } from "./health.mjs";
import { jwksRouter } from "./jwks.mjs";

const router = Router();

router.use("/", healthRouter);
router.use("/", jwksRouter);

router.use(availability);

export { router };
