// @ts-check
import nconf from "nconf";

import { app } from "./app.mjs";
import { connection, createConnection } from "./models/index.mjs";
import { addGracefulShutdown, handleShutdown } from "./utils/index.mjs";

var port = nconf.get("AUTH_EXPRESS_PORT");

var server = addGracefulShutdown(
  app.listen(port, () => console.log(`listening on port ${port}`)),
);

await createConnection(nconf.get("AUTH_MONGODB_URI"), {
  dbName: "auth",
  serverSelectionTimeoutMS: 30000,
});

["SIGINT", "SIGTERM"].forEach((signal) =>
  process.once(signal, () => handleShutdown(server, [connection])),
);

export { server };
