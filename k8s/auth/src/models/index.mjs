// @ts-check
import mongoose from "mongoose";
import nconf from "nconf";

import { ChallengeSchema } from "./Challenge.schema.mjs";
import { PasskeySchema } from "./Passkey.schema.mjs";
import { RefreshTokenSchema } from "./RefreshToken.schema.mjs";
import { UserSchema } from "./User.schema.mjs";

var authDbConnection = await mongoose
  .createConnection(nconf.get("AUTH_MONGODB_URI"), {
    dbName: "auth",
    /**
     * https://mongoosejs.com/docs/connections.html#serverselectiontimeoutms
     */
    serverSelectionTimeoutMS: 30000,
  })
  .asPromise();

authDbConnection.model("Challenge", ChallengeSchema);
authDbConnection.model("Passkey", PasskeySchema);
authDbConnection.model("RefreshToken", RefreshTokenSchema);
authDbConnection.model("User", UserSchema);

export { authDbConnection };
