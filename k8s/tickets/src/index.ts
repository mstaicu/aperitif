import type { Socket } from "net";
import mongoose from "mongoose";

import { nats } from "./events/nats";

import {
  OrderCancelledListener,
  OrderCreatedListener,
} from "./events/listeners";

import { app } from "./app";

const start = async () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET must be defined as an environment variable");
  }

  if (!process.env.TICKETS_MONGO_URI) {
    throw new Error(
      "TICKETS_MONGO_URI must be defined as an environment variable"
    );
  }

  if (!process.env.DOMAIN) {
    throw new Error("DOMAIN must be defined as an environment variable");
  }
  if (!process.env.NATS_CLIENT_ID) {
    throw new Error(
      "NATS_CLIENT_ID must be defined as an environment variable"
    );
  }
  if (!process.env.NATS_URL) {
    throw new Error("NATS_URL must be defined as an environment variable");
  }

  try {
    await mongoose.connect(process.env.TICKETS_MONGO_URI);

    await nats.connect(process.env.DOMAIN, process.env.NATS_CLIENT_ID, {
      url: process.env.NATS_URL,
    });
  } catch (err) {
    console.error(err);
  }

  new OrderCreatedListener(nats.client).listen();
  new OrderCancelledListener(nats.client).listen();

  const server = app.listen(3000, () => console.log("Listening on port 3000"));

  let sockets: Socket[] = [],
    nextSocketId = 0;

  server.on("connection", (socket) => {
    const socketId = nextSocketId++;
    sockets[socketId] = socket;

    socket.once("close", () => delete sockets[socketId]);
  });

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
     * waitForSocketsToClose will give existing connections 10 seconds to terminate before destroying the sockets
     *
     * the server is finally closed when all connections are ended and the server emits a 'close' event.
     */
    waitForSocketsToClose(10);

    /**
     * inform NATS streaming server that this client is no longer active
     */

    /**
     * TODO: This might .. blow ... if we call close on the client in the case when nats emits a close event
     */
    nats.client.close();

    /**
     * https://nodejs.org/api/net.html#net_server_close_callback
     *
     * server.close([callback])
     *
     * callback <Function> Called when the server is closed.
     * Returns: <net.Server>
     *
     * Stops the server from accepting new connections and keeps existing connections
     * This function is asynchronous, the server is finally closed when all connections are ended and the server emits a 'close' event.
     * The optional callback will be called once the 'close' event occurs. Unlike that event, it will be called with an Error as its only argument if the server was not open when it was closed.
     */

    server.close((err) => {
      if (err) {
        console.error(err);
        process.exitCode = 1;
      }

      process.exit();
    });
  };

  const waitForSocketsToClose = (counter: number): any => {
    if (counter > 0) {
      console.log(
        `Waiting ${counter} more ${
          counter !== 1 ? "seconds" : "second"
        } for all connections to close...`
      );

      return setTimeout(waitForSocketsToClose, 1000, counter - 1);
    }

    console.log("Forcing all connections to close now");

    for (const socket of sockets) {
      socket.destroy();
    }
  };
};

start();
