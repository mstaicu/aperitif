// @ts-check
import nconf from "nconf";

import { app } from "./app.mjs";
// import { connect } from "./messaging/index.mjs";
import { createConnection } from "./models/index.mjs";
import { addGracefulShutdown } from "./utils/index.mjs";

var PORT = 3000;

var server = addGracefulShutdown(
  app.listen(PORT, () => console.log(`listening on port ${PORT}`)),
);

var connection = await createConnection(nconf.get("MONGO_DB_URI"), {
  autoIndex: false,
  bufferCommands: false,
  dbName: "identitys",
});

// var nc = await connect();

// var shutdownInitiated = false;

// ["SIGINT", "SIGTERM", "SIGUSR2"].forEach((signal) =>
//   process.on(signal, async () => {
//     if (shutdownInitiated) return;

//     shutdownInitiated = true;

//     console.log("closing server connections...");
//     await server.gracefulShutdown();

//     if (connection.readyState !== 0) {
//       console.log("closing database connection...");
//       try {
//         await connection.close();
//       } catch {
//         console.error("error closing mongoose connection");
//       }
//     }

//     if (!nc.isClosed()) {
//       console.log("closing nats connection...");
//       try {
//         await nc.drain();
//       } catch {
//         console.error("error draining nats");

//         try {
//           await nc.close();
//         } catch {
//           console.error("error force-closing nats");
//         }
//       }

//       try {
//         await nc.closed();
//       } catch {
//         console.error("error waiting for nats to close");
//       }
//     }

//     console.log("shutdown complete");

//     process.exit(0);
//   }),
// );

export { server };
