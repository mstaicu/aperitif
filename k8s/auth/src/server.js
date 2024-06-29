// @ts-check
import mongoose from "mongoose";
import nconf from "nconf";

import { app } from "./app.js";

import { graceful } from "./utils/graceful.js";

/**
 *
 */

nconf.env({ lowerCase: true, parseValues: true, separator: "_" });

var port = nconf.get("auth:express:port");
var mongoUri = nconf.get("auth:mongodb:uri");
var dbName = nconf.get("auth:mongodb:options:dbname");

/**
 *
 */

await mongoose.connect(mongoUri, {
  dbName,
});

var close = graceful(
  app.listen(port, () => console.log(`Listening on port ${port}`))
);

var shutdown = async () => {
  try {
    await close();

    await mongoose.connection.close();

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
