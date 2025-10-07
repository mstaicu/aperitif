// @ts-check
import mongoose from "mongoose";

import { ChallengeSchema } from "./Challenge.schema.mjs";
import { MagicLinkSchema } from "./MagicLink.schema.mjs";
import { PasskeySchema } from "./Passkey.schema.mjs";
import { RefreshTokenSchema } from "./RefreshToken.schema.mjs";
import { UserSchema } from "./User.schema.mjs";

export var Challenge = mongoose.model("Challenge", ChallengeSchema);
export var Passkey = mongoose.model("Passkey", PasskeySchema);
export var RefreshToken = mongoose.model("RefreshToken", RefreshTokenSchema);
export var User = mongoose.model("User", UserSchema);
export var MagicLink = mongoose.model("MagicLink", MagicLinkSchema);
