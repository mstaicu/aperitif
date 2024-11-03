import express from "express";
import promClient from "prom-client";

const router = express.Router();

router.get("/metrics", async (req, res) => {
  res.set("Content-Type", promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

export { router as metricsRouter };
