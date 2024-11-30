// @ts-check
import mongoose from "mongoose";

import { ChallengeSchema } from "./Challenge.schema.mjs";
import { PasskeySchema } from "./Passkey.schema.mjs";
import { RefreshTokenSchema } from "./RefreshToken.schema.mjs";
import { UserSchema } from "./User.schema.mjs";

/**
 * @type {mongoose.Connection}
 */
var connection;

/**
 *
 * @param {string} uri
 * @param {mongoose.ConnectOptions} options
 */
var createConnection = (uri, options) => {
  connection = mongoose.createConnection(uri, options);

  connection.model("Challenge", ChallengeSchema);
  connection.model("Passkey", PasskeySchema);
  connection.model("RefreshToken", RefreshTokenSchema);
  connection.model("User", UserSchema);

  if (!options.autoIndex) {
    connection.once("open", () =>
      Promise.all(
        Object.values(connection.models).map((model) => model.syncIndexes()),
      )
        .then(() => console.log("indexes synchronized successfully."))
        .catch((error) =>
          console.error("error during index synchronization:", error),
        ),
    );
  }

  return connection.asPromise();
};

export { connection, createConnection };
