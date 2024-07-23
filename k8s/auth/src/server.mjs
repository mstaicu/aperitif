// @ts-check
import mongoose from "mongoose";
import nconf from "nconf";

import { app } from "./app.mjs";

import { withRetry, withGracefulShutdown } from "./utils/index.mjs";

/**
 * @type {mongoose.Connection}
 */
var connection = await withRetry()(() =>
  mongoose.connect(nconf.get("AUTH_MONGODB_URI"), {
    dbName: nconf.get("AUTH_MONGODB_OPTIONS_DBNAME"),
  })
);

var port = nconf.get("AUTH_EXPRESS_PORT");

var server = withGracefulShutdown(
  app.listen(port, () => console.log(`Listening on port ${port}`))
);

var shutdown = async () => {
  try {
    await server.gracefulShutdown();

    await connection.close();

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
