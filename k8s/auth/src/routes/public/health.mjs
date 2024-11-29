import express from "express";

import { connection } from "../../models/index.mjs";

var router = express.Router();

router.get("/readyz", (_, res) =>
  connection && connection.readyState === 1
    ? res.sendStatus(200)
    : res.sendStatus(500),
);

router.get("/healthz", (_, res) => res.sendStatus(200));

export { router as healthRouter };
