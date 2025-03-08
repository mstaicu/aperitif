import express from "express";

import { connection } from "../models/index.mjs";

var router = express.Router();

router.get("/readyz", async (_, res) => {
  try {
    if (!connection || connection.readyState !== 1) {
      throw new Error("mongoose connection is not available");
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("readiness check failed:", error.message);
    res.sendStatus(500);
  }
});

router.get("/healthz", (_, res) => {
  res.sendStatus(200);
});

export { router as healthRouter };
