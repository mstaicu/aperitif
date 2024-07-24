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
    /**
     * @param {Error & {code?: string}} err
     * @returns {boolean} - Returns true if the error should trigger a retry.
     */
    shouldRetry: (err) => {
      var retryableErrors = [
        "MongoNetworkError",
        "MongoTimeoutError",
        "MongoServerSelectionError",
        "MongoWriteConcernError",
        "MongoServerError",
        "MongoNotPrimaryError",
        "ECONNREFUSED",
        "EHOSTUNREACH",
        "EPIPE",
        "ETIMEDOUT",
      ];
      return (
        retryableErrors.includes(err.name) ||
        retryableErrors.includes(err.code || "")
      );
    },
    onAttempt: (attempt, err) =>
      console.log(
        `Retrying connection attempt ${attempt} due to error: ${err.message}`
      ),
  })(() => mongoose.createConnection(uri, options));

var authDbConnection = await createConnection(nconf.get("AUTH_MONGODB_URI"), {
  dbName: nconf.get("AUTH_MONGODB_OPTIONS_DBNAME"),
});

export { authDbConnection };
