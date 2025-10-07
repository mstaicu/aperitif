import mongoose from "mongoose";
import nconf from "nconf";

import { startAuthConsumer } from "./consumers/auth.mjs";
import { connect } from "./nats.mjs";

await mongoose.connect(nconf.get("MONGO_DB_URI"), {
  autoIndex: false,
  bufferCommands: false,
  dbName: "auth-api",
});

if (!mongoose.get("autoIndex")) {
  await Promise.all(
    Object.values(mongoose.models).map((model) => model.syncIndexes()),
  );
  console.log("indexes synchronized");
}

var nc = await connect();

await startAuthConsumer(nc);

console.log("listening");

var shutdownInitiated = false;

["SIGINT", "SIGTERM", "SIGUSR2"].forEach((signal) =>
  process.on(signal, async () => {
    if (shutdownInitiated) return;

    shutdownInitiated = true;

    console.log("closing worker connections...");

    if (mongoose.connection.readyState !== 0) {
      console.log("closing database connection...");
      try {
        await mongoose.connection.close();
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
