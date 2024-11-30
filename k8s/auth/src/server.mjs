// @ts-check
import nconf from "nconf";

import { app } from "./app.mjs";
import { createConnection } from "./models/index.mjs";
import { addGracefulShutdown, handleShutdown } from "./utils/index.mjs";

var PORT = 3000;

var server = addGracefulShutdown(
  app.listen(PORT, () => console.log(`listening on port ${PORT}`)),
);

var connection = await createConnection(nconf.get("MONGO_DB_URI"), {
  autoIndex: false,
  bufferCommands: false,
  dbName: "auth",
});

["SIGINT", "SIGTERM", "SIGUSR2"].forEach((signal) =>
  process.once(signal, () => handleShutdown(server, connection)),
);

export { server };
