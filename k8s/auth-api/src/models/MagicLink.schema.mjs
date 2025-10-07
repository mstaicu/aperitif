// @ts-ignore
import { randomUUID } from "crypto";
import { Schema } from "mongoose";

export var MagicLinkSchema = new Schema({
  _id: {
    default: randomUUID,
    type: String,
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
