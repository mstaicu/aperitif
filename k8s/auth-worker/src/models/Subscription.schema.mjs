// @ts-check
import { Schema } from "mongoose";
import { randomUUID } from "node:crypto";

var SubscriptionSchema = new Schema(
  {
    _id: {
      default: randomUUID,
      type: String,
    },
    userId: { required: true, type: String }, // base64url encoded user id
  },
  { timestamps: true },
);

export { SubscriptionSchema };
