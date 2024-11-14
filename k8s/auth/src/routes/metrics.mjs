// @ts-check
import { Router } from "express";
import promClient from "prom-client";

const router = Router();

router.get("/metrics", async (_, res) => {
  res.set("Content-Type", promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

export { router as metricsRouter };
