import { nats } from "./events/nats";

import {
  // OrderCancelledListener,
  OrderCreatedListener,
} from "./events/listeners";

const start = async () => {
  if (!process.env.NATS_CLUSTER_ID) {
    throw new Error(
      "NATS_CLUSTER_ID must be defined as an environment variable"
    );
  }
  if (!process.env.NATS_CLIENT_ID) {
    throw new Error(
      "NATS_CLIENT_ID must be defined as an environment variable"
    );
  }
  if (!process.env.NATS_URL) {
    throw new Error("NATS_URL must be defined as an environment variable");
  }
  if (!process.env.EXPIRATION_REDIS_HOST) {
    throw new Error(
      "EXPIRATION_REDIS_HOST must be defined as an environment variable"
    );
  }

  try {
    await nats.connect(
      process.env.NATS_CLUSTER_ID,
      process.env.NATS_CLIENT_ID,
      {
        url: process.env.NATS_URL,
      }
    );
  } catch (err) {
    console.error(err);
  }

  new OrderCreatedListener(nats.client).listen();

  process.on("SIGINT", () => {
    console.info("Received SIGINT, gracefully shutting down");
    shutdown();
  });

  process.on("SIGTERM", () => {
    console.info("Received SIGTERM, gracefully shutting down");
    shutdown();
  });

  nats.client.on("close", () => {
    console.info("NATS streaming server closed, gracefully shutting down");
    shutdown();
  });

  const shutdown = () => {
    /**
     * TODO: This might .. blow ... if we call close on the client in the case when nats emits a close event
     */
    nats.client.close();

    process.exit();
  };
};

start();
