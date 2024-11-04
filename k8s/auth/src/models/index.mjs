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
var createConnection = async (uri, options) => {
  connection = await mongoose.createConnection(uri, options).asPromise();

  connection.model("Challenge", ChallengeSchema);
  connection.model("Passkey", PasskeySchema);
  connection.model("RefreshToken", RefreshTokenSchema);
  connection.model("User", UserSchema);

  if (!options.autoIndex) {
    connection.once("open", () =>
      Promise.all(
        Object.values(connection.models).map((model) => model.syncIndexes()),
      )
        .then(() => console.log("Indexes synchronized successfully."))
        .catch((error) =>
          console.error("Error during index synchronization:", error),
        ),
    );
  }

  return connection;
};

export { connection, createConnection };
