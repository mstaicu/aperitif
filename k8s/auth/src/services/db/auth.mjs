// @ts-check
import mongoose from "mongoose";
import nconf from "nconf";

import { withRetry } from "../../utils/index.mjs";

/**
 * @param {string} uri
 * @param {mongoose.ConnectOptions} options
 * @returns {Promise<mongoose.Connection>}
 */
var createConnection = async (uri, options) =>
  withRetry()(() => mongoose.createConnection(uri, options));

var authDbConnection = await createConnection(nconf.get("AUTH_MONGODB_URI"), {
  dbName: nconf.get("AUTH_MONGODB_OPTIONS_DBNAME"),
});

export { authDbConnection };
