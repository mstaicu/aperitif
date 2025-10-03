// @ts-check
import mongoose from "mongoose";

import { ChallengeSchema } from "./Challenge.schema.mjs";
import { PasskeySchema } from "./Passkey.schema.mjs";
import { RefreshTokenSchema } from "./RefreshToken.schema.mjs";

export var Challenge = mongoose.model("Challenge", ChallengeSchema);
export var Passkey = mongoose.model("Passkey", PasskeySchema);
export var RefreshToken = mongoose.model("RefreshToken", RefreshTokenSchema);
