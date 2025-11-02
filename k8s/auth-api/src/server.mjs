// @ts-check
import { connect, credsAuthenticator } from "@nats-io/transport-node";
import express from "express";
import mongoose from "mongoose";
import nconf from "nconf";
import { readFileSync } from "node:fs";

import { registerModels } from "./models/index.mjs";
import { sdk } from "./otel.mjs";
import {
  getHealthzHandler,
  getJwksHandler,
  getOpenApiHandler,
  getReadyzHandler,
} from "./routes/index.mjs";
import { addGracefulShutdown } from "./utils/index.mjs";

// MONGOOSE phase

var connection = await mongoose
  .createConnection(nconf.get("MONGO_DB_URI"), {
    autoIndex: false,
    bufferCommands: false,
    dbName: "auth-api",
  })
  .asPromise();

var models = registerModels(connection);

// NATS phase

var authenticator = credsAuthenticator(
  new Uint8Array(readFileSync(nconf.get("NATS_CREDS_KEY_PATH"))),
);

var servers = Array.from(Array(3)).map(
  (_, index) =>
    `nats://nats-depl-${index}.nats-headless.nats.svc.cluster.local:4222`,
);

var nc = await connect({
  authenticator,
  name: "auth-api",
  servers,
});

// APP phase

var PORT = 3000;

var app = express();
app.disable("x-powered-by");
app.use(express.json());

app.get("/healthz", getHealthzHandler());
app.get("/readyz", getReadyzHandler(connection, nc));

app.get("/openapi.json", getOpenApiHandler());
app.get("/.well-known/jwks.json", getJwksHandler());

app.use((_, res, next) =>
  connection.readyState !== 1 || nc.isClosed() ? res.sendStatus(503) : next(),
);

// Business logic routes

var server = addGracefulShutdown(
  app.listen(PORT, () => console.log(`listening on port ${PORT}`)),
);

var shutdownInitiated = false;

["SIGINT", "SIGTERM", "SIGUSR2"].forEach((signal) =>
  process.on(signal, async () => {
    if (shutdownInitiated) return;

    shutdownInitiated = true;

    console.log("closing server connections...");
    await server.gracefulShutdown();

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

    try {
      await sdk.shutdown();
      console.log("tracing terminated");
    } catch {
      console.error("error terminating tracing");
    }

    console.log("shutdown complete");

    process.exit(0);
  }),
);

if (!connection.get("autoIndex")) {
  await Promise.all(Object.values(models).map((model) => model.syncIndexes()));
  console.log("indexes synchronized");
}

export { server };
