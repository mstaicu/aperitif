// @ts-check
import nconf from "nconf";

import { app } from "./app.mjs";

import { withGracefulShutdown } from "./utils/index.mjs";
import { authDbConnection, redis } from "./services/index.mjs";

await authDbConnection.asPromise();

var port = nconf.get("AUTH_EXPRESS_PORT");

var server = withGracefulShutdown(
  app.listen(port, () => console.log(`Listening on port ${port}`))
);

var shutdown = async () => {
  try {
    await server.gracefulShutdown();

    await authDbConnection.close();
    await redis.quit();

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
