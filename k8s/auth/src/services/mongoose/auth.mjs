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
  withRetry({
    maxAttempts: Number.POSITIVE_INFINITY,
    onAttempt: (attempt, err) =>
      console.log(
        `Retrying connection attempt ${attempt} due to error: ${err.message}`
      ),
  })(() => mongoose.createConnection(uri, options).asPromise());

var authDbConnection = await createConnection(nconf.get("AUTH_MONGODB_URI"), {
  dbName: "auth",
  /**
   * https://mongoosejs.com/docs/connections.html#serverselectiontimeoutms
   *
   * By default, serverSelectionTimeoutMS is 30000 (30 seconds).
   * This means that, for example, if you call mongoose.connect()
   * when your standalone MongoDB server is down,
   * your mongoose.connect() call will only throw an error after 30 seconds
   */
  serverSelectionTimeoutMS: 5000,
});

export { authDbConnection };
