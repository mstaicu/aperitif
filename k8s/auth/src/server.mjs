import { connect, credsAuthenticator } from "@nats-io/transport-node";
import { readFileSync } from "fs";
// @ts-check
import nconf from "nconf";

import { app } from "./app.mjs";
import { createConnection } from "./models/index.mjs";
import { addGracefulShutdown } from "./utils/index.mjs";

var PORT = 3000;

var server = addGracefulShutdown(
  app.listen(PORT, () => console.log(`listening on port ${PORT}`)),
);

var connection = await createConnection(nconf.get("MONGO_DB_URI"), {
  autoIndex: false,
  bufferCommands: false,
  dbName: "auth",
});

var authenticator = credsAuthenticator(
  new Uint8Array(readFileSync("/secrets/auth.creds")),
);

var nc = await connect({
  authenticator,
  servers: "nats://nats:4222",
});

var shutdownInitiated = false;

["SIGINT", "SIGTERM", "SIGUSR2"].forEach((signal) =>
  process.once(signal, async () => {
    if (shutdownInitiated) {
      return;
    }

    shutdownInitiated = true;

    console.log("initiating graceful shutdown");

    try {
      if (server && server.gracefulShutdown) {
        console.log("closing server connections...");
        await server.gracefulShutdown();
      }

      console.log("closing database connection...");

      if (connection.readyState === 1) {
        await connection.close();
      }

      console.log("shutdown complete");

      process.exit(0);
    } catch {
      process.exit(1);
    }
  }),
);

export { server };
