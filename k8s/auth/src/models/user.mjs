// @ts-check
import { Schema } from "mongoose";

import { authDbConnection } from "../services/index.mjs";

var UserSchema = new Schema({}, { timestamps: true });

var User = authDbConnection.model("User", UserSchema);

export { User };
