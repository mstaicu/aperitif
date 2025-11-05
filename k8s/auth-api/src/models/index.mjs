// @ts-check
import { ChallengeSchema } from "./Challenge.schema.mjs";
import { PasskeySchema } from "./Passkey.schema.mjs";
import { RefreshTokenSchema } from "./RefreshToken.schema.mjs";

/**
 * @param {import('mongoose').Connection} connection
 */
export function registerModels(connection) {
  var Challenge = connection.model("Challenge", ChallengeSchema);
  var Passkey = connection.model("Passkey", PasskeySchema);
  var RefreshToken = connection.model("RefreshToken", RefreshTokenSchema);

  return { Challenge, Passkey, RefreshToken };
}
