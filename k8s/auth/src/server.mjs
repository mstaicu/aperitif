// @ts-check
import mongoose from "mongoose";
import nconf from "nconf";

import { app } from "./app.mjs";

import { withGracefulShutdown } from "./utils/mixins/with_graceful_shutdown.mjs";

var mongoUri = nconf.get("AUTH_MONGODB_URI");
var dbName = nconf.get("AUTH_MONGODB_OPTIONS_DBNAME");

await mongoose.connect(mongoUri, {
  dbName,
});

var port = nconf.get("AUTH_EXPRESS_PORT");

var server = withGracefulShutdown(
  app.listen(port, () => console.log(`Listening on port ${port}`))
);

var shutdown = async () => {
  try {
    await server.gracefulShutdown();

    await mongoose.connection.close();

    process.exit(0);
  } catch (error) {
    /**
     * TODO: Log error
     */
    console.error(error);
    process.exit(1);
  }
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
