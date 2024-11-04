import nconf from "nconf";

import { app } from "./app.mjs";
import { createConnection } from "./models/index.mjs";
import { addGracefulShutdown, handleShutdown } from "./utils/index.mjs";

var port = nconf.get("PORT");

var server = addGracefulShutdown(
  app.listen(port, () => console.log(`listening on port ${port}`)),
);

var connection = await createConnection(nconf.get("MONGO_DB_URI"), {
  autoIndex: false,
  bufferCommands: false,
  dbName: "auth",
});

["SIGINT", "SIGTERM", "SIGUSR2"].forEach((signal) =>
  process.once(signal, () => handleShutdown(server, [connection])),
);

export { server };
