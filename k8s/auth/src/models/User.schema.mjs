// @ts-check
import { Schema } from "mongoose";
import { randomUUID } from "node:crypto";

var UserSchema = new Schema(
  {
    _id: {
      default: randomUUID,
      type: String,
    },
    email: { required: true, type: String, unique: true },
  },
  { timestamps: true },
);

export { UserSchema };
