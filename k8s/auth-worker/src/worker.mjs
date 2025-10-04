import { jetstream, jetstreamManager } from "@nats-io/jetstream";
import {
  credsAuthenticator,
  connect as natsConnect,
} from "@nats-io/transport-node";
import { readFileSync } from "fs";
import mongoose from "mongoose";
import nconf from "nconf";

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

var authenticator = credsAuthenticator(
  new Uint8Array(readFileSync("/secrets/auth.creds")),
);

var servers = Array.from(Array(3)).map(
  (_, index) =>
    `nats://nats-depl-${index}.nats-headless.nats.svc.cluster.local:4222`,
);

var nc = await natsConnect({
  authenticator,
  servers,
});

var js = jetstream(nc);
var jsm = await jetstreamManager(nc);

console.log(js, jsm);

// Add listeners

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
