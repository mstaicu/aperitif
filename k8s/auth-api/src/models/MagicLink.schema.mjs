// @ts-ignore
import { randomUUID } from "crypto";
import { Schema } from "mongoose";

export var MagicLinkSchema = new Schema({
  _id: {
    default: randomUUID,
    type: String,
  },
  createdAt: {
    default: Date.now,
    expires: 60 * 15, // document expires at createdAt + 'expires' seconds
    type: Date,
  },
  email: {
    index: true,
    required: true,
    type: String,
  },
  used: {
    default: false,
    type: Boolean,
  },
});
