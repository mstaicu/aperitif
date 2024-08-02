// @ts-check
import { Schema } from "mongoose";

import { authDbConnection } from "../services/index.mjs";

var UserSchema = new Schema(
  {
    email: String,
    devices: {
      type: [],
      default: [],
    },
  },
  {
    optimisticConcurrency: true,
    versionKey: "version",
  }
);

var User = authDbConnection.model("user", UserSchema);

export { User };
