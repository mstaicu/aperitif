// @ts-check
import { Schema } from "mongoose";

import { authDbConnection } from "../services/index.mjs";

var userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
    },
    devices: {
      type: [],
      default: [],
    },
  },
  {
    optimisticConcurrency: true,
    versionKey: "version",
    toJSON: {
      transform(_, ret) {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

var User = authDbConnection.model("User", userSchema);

export { User };
