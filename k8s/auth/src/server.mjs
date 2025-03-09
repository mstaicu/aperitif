// @ts-check
import nconf from "nconf";

import { app } from "./app.mjs";
import { connect } from "./messaging/index.mjs";
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

var nc = await connect();

var shutdownInitiated = false;

["SIGINT", "SIGTERM", "SIGUSR2"].forEach((signal) =>
  process.once(signal, async () => {
    if (shutdownInitiated) return;

    shutdownInitiated = true;

    console.log(`initiating graceful shutdown (${signal})`);

    try {
      console.log("closing server connections...");
      await server.gracefulShutdown();

      if (connection.readyState === 1) {
        console.log("closing database connection...");
        try {
          await connection.close();
        } catch {
          await connection.close(true);
        }
      }

      if (!nc.isClosed()) {
        console.log("closing nats connection...");
        try {
          await nc.drain();
        } catch {
          await nc.close();
        }
      }

      console.log("shutdown complete");

      process.exit(0);
    } catch {
      process.exit(1);
    }
  }),
);

export { server };
