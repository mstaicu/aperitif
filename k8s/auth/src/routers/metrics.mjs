// @ts-check
import { Router } from "express";
import { register } from "prom-client";

const router = Router();

router.get("/metrics", async (_, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

export { router as metricsRouter };
