// @ts-check
import nconf from "nconf";

import { app } from "./app.mjs";
import { authDbConnection } from "./models/index.mjs";
import { addGracefulShutdown, handleShutdown } from "./utils/index.mjs";

var port = nconf.get("AUTH_EXPRESS_PORT");

var server = addGracefulShutdown(
  app.listen(port, () => console.log(`listening on port ${port}`)),
);

["SIGINT", "SIGTERM"].forEach((signal) =>
  process.once(signal, () => handleShutdown(server, [authDbConnection])),
);

export { server };
