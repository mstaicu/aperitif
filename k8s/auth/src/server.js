// @ts-check
import mongoose from "mongoose";
import nconf from "nconf";

import { app } from "./app.js";
/**
 * TODO: Move to commons
 */
import { graceful } from "./utils/graceful.js";

await mongoose.connect(nconf.get("mongodb:uri"), {
  dbName: nconf.get("mongodb:options:dbName"),
  user: nconf.get("mongodb:options:user"),
  pass: nconf.get("mongodb:options:pass"),
});

var port = nconf.get("express:port");

var close = graceful(
  app.listen(port, () => console.log(`Listening on port ${port}`))
);

var shutdown = async () => {
  try {
    await close();
    await mongoose.connection.close();

    process.exit(0);
  } catch (error) {
    /**
     * TODO: Add logging
     */
    console.error(error);
    process.exit(1);
  }
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
