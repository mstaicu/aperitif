import { ChallengeSchema } from "./Challenge.schema.mjs";
import { MagicLinkSchema } from "./MagicLink.schema.mjs";
import { PasskeySchema } from "./Passkey.schema.mjs";
import { RefreshTokenSchema } from "./RefreshToken.schema.mjs";
import { UserSchema } from "./User.schema.mjs";

/**
 *
 * @param {import('mongoose').Connection} connection
 */
export function registerModels(connection) {
  var Challenge = connection.model("Challenge", ChallengeSchema);
  var MagicLink = connection.model("MagicLink", MagicLinkSchema);
  var Passkey = connection.model("Passkey", PasskeySchema);
  var RefreshToken = connection.model("RefreshToken", RefreshTokenSchema);
  var User = connection.model("User", UserSchema);

  return { Challenge, MagicLink, Passkey, RefreshToken, User };
}
