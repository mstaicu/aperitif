import express from "express";
import mongoose from "mongoose";

import { connect } from "../nats.mjs";

var router = express.Router();
var nc = await connect();

router.get("/readyz", async (_, res) => {
  var dbAvailable = mongoose.connection && mongoose.connection.readyState === 1;
  var ncAvailable = nc && !nc.isClosed();

  var ready = dbAvailable && ncAvailable;

  res.sendStatus(ready ? 200 : 500);
});

router.get("/healthz", (_, res) => {
  res.sendStatus(200);
});

export { router as healthRouter };
