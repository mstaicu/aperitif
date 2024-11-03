import express from "express";

import { availability, prometheus } from "../middleware/index.mjs";
import { healthRouter } from "./health.mjs";

const router = express.Router();

router.use(prometheus);

router.use("/", healthRouter);

router.use(availability);

export { router };
