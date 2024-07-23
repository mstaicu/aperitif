// @ts-check
import { Schema } from "mongoose";

import { authDbConnection } from "../services/index.mjs";

const userSchema = new Schema(
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

const User = authDbConnection.model("User", userSchema);

export { User };
