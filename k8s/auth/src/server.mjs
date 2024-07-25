// @ts-check
import nconf from "nconf";

import { withGracefulShutdown } from "./utils/index.mjs";
import { authDbConnection, redis } from "./services/index.mjs";

import { app } from "./app.mjs";

var port = nconf.get("AUTH_EXPRESS_PORT");

var server = withGracefulShutdown(
  app.listen(port, () => console.log(`listening on port ${port}`))
);

var shutdown = async () => {
  try {
    await server.gracefulShutdown();

    if (authDbConnection.readyState === 1) {
      await authDbConnection.close();
    }

    if (await redis.ping()) {
      await redis.quit();
    }

    console.log("shutdown complete");

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
