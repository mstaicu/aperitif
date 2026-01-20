import { connect } from "@nats-io/transport-node";
import mongoose from "mongoose";
import nconf from "nconf";

import { startAuthConsumer } from "./consumers/auth.mjs";

var connection = await mongoose
  .createConnection(nconf.get("MONGO_DB_URI"), {
    autoIndex: false,
    bufferCommands: false,
    dbName: "auth-api",
  })
  .asPromise();

var servers = Array.from(Array(3)).map(
  (_, index) =>
    `nats://nats-depl-${index}.nats-headless.nats.svc.cluster.local:4222`,
);

var nc = await connect({
  name: "auth-worker",
  servers,
});

startAuthConsumer(nc);

console.log("listening");

var shutdownInitiated = false;

["SIGINT", "SIGTERM", "SIGUSR2"].forEach((signal) =>
  process.on(signal, async () => {
    if (shutdownInitiated) return;

    shutdownInitiated = true;

    console.log("closing worker connections...");

    if (connection.readyState !== 0) {
      console.log("closing database connection...");
      try {
        await connection.close();
      } catch {
        console.error("error closing mongoose connection");
      }
    }

    if (!nc.isClosed()) {
      console.log("closing nats connection...");

      try {
        await nc.drain();
      } catch {
        console.error("error draining nats");

        try {
          await nc.close();
        } catch {
          console.error("error force-closing nats");
        }
      }

      try {
        await nc.closed();
      } catch {
        console.error("error waiting for nats to close");
      }
    }

    console.log("shutdown complete");

    process.exit(0);
  }),
);
