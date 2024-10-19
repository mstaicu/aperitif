// @ts-check
import express from "express";

import { connection } from "../models/index.mjs";

var router = express.Router();

router.get("/readiness", (req, res) => {
  if (connection && connection.readyState === 1) {
    res.sendStatus(200);
  } else {
    res.sendStatus(500);
  }
});

router.get("/healthz", (_, res) => {
  res.sendStatus(200);
});

export { router as healtzRouter };
