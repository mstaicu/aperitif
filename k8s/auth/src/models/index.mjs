// @ts-check
import { authDbConnection } from "../services/index.mjs";

import { ChallengeSchema } from "./Challenge.schema.mjs";
import { PasskeySchema } from "./Passkey.schema.mjs";
import { RefreshTokenSchema } from "./RefreshToken.schema.mjs";
import { UserSchema } from "./User.schema.mjs";

var Challenge = authDbConnection.model("Challenge", ChallengeSchema);
var Passkey = authDbConnection.model("Passkey", PasskeySchema);
var RefreshToken = authDbConnection.model("RefreshToken", RefreshTokenSchema);
var User = authDbConnection.model("User", UserSchema);

export { Challenge, Passkey, RefreshToken, User };
