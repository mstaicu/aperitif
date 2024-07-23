// @ts-check
import nconf from "nconf";

import { app } from "./app.mjs";

import { withGracefulShutdown } from "./utils/index.mjs";
import { authDbConnection } from "./services/index.mjs";

await authDbConnection.asPromise();

var port = nconf.get("AUTH_EXPRESS_PORT");

var server = withGracefulShutdown(
  app.listen(port, () => console.log(`Listening on port ${port}`))
);

var shutdown = async () => {
  try {
    await authDbConnection.close();

    await server.gracefulShutdown();

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
