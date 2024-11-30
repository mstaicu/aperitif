// @ts-check
import { Schema } from "mongoose";
import { randomUUID } from "node:crypto";

var PasskeySchema = new Schema(
  {
    _id: {
      default: randomUUID,
      type: String,
    },
    user: { ref: "User", required: true, type: String },
  },
  { timestamps: true },
);

export { PasskeySchema };
