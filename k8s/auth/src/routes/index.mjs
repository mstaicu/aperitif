// @ts-check
import { Router } from "express";

import { serviceAvailability } from "../middleware/index.mjs";
import { healthRouter } from "./health.mjs";
// import { jwksRouter } from "./jwks.mjs";

const router = Router();

router.use("/", healthRouter);
// router.use("/", jwksRouter);

router.use(serviceAvailability);

// Business logic routes come after

export { router };
