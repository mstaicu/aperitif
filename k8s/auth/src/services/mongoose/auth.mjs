// @ts-check
import mongoose from "mongoose";
import nconf from "nconf";

import { withRetry } from "../../utils/index.mjs";

/**
 * When you call mongoose.createConnection(), you create a new connection
 * object that Mongoose tracks in the mongoose.connections property
 *
 * Here's a couple examples when you would need to create multiple connections:
 * 1. Your app needs to acess data stored in multiple databases.
 *  A Mongoose connection is scoped to exactly one database -
 *  if you need to create models on different databases, you need a separate connection.
 *
 * 2. Your app has certain operations that are slow, and you don't want the slow operations
 *  to cause performance issues on fast queries.
 *
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
