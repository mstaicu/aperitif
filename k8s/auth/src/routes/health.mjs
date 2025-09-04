import express from "express";
import mongoose from "mongoose";

// import { nc } from "../messaging/index.mjs";

var router = express.Router();

router.get("/readyz", async (_, res) => {
  var dbAvailable = mongoose.connection && mongoose.connection.readyState === 1;
  // var ncAvailable = nc && !nc.isClosed();

  res.sendStatus(dbAvailable ? 200 : 500);
});

router.get("/healthz", (_, res) => {
  res.sendStatus(200);
});

export { router as healthRouter };
