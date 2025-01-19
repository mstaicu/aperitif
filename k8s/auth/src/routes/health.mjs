// @ts-check
import { jetstreamManager } from "@nats-io/jetstream";
import express from "express";

import { connection } from "../models/index.mjs";
import { connection as natsConnection } from "../nats/index.mjs";

var router = express.Router();

router.get("/readyz", async (_, res) => {
  try {
    if (!connection || connection.readyState !== 1) {
      throw new Error("mongoose connection is not available");
    }

    if (!natsConnection || natsConnection.isClosed()) {
      throw new Error("jetstream connection is not available");
    }

    var jsm = await jetstreamManager(natsConnection);

    await jsm.streams.info("subscriptions");
    await jsm.consumers.info("subscriptions", "auth-service.subscriptions.all");

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
