import express from "express";

// import { nc } from "../messaging/index.mjs";
import { connection } from "../models/index.mjs";

var router = express.Router();

router.get("/readyz", async (_, res) => {
  // var dbAvailable = connection && connection.readyState === 1;
  // var ncAvailable = nc && !nc.isClosed();

  // var serviceUnavailable = !dbAvailable || !ncAvailable;

  // res.sendStatus(serviceUnavailable ? 500 : 200);
  res.sendStatus(200);
});

router.get("/healthz", (_, res) => {
  res.sendStatus(200);
});

export { router as healthRouter };
