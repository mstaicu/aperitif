// @ts-check
import { Schema, model } from "mongoose";

var userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
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

var User = model("User", userSchema);

var Users = [];

export { User, Users };
