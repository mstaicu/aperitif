// @ts-check
import express from "express";

import { connection } from "../models/index.mjs";

var router = express.Router();

// Readiness Probe: Check if the app is ready to receive traffic, especially the DB connection
router.get("/readiness", (req, res) => {
  if (connection && connection.readyState === 1) {
    res.sendStatus(200); // DB connection is ready
  } else {
    res.sendStatus(500); // Not ready, DB connection is not established
  }
});

// Liveness Probe: Always return 200 if the app is running, regardless of DB connection
router.get("/healthz", (_, res) => {
  res.sendStatus(200); // Always indicate that the app is alive
});

export { router as healtzRouter };
