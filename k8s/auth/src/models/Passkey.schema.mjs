// @ts-check
import { Schema } from "mongoose";
import { randomUUID } from "node:crypto";

var PasskeySchema = new Schema(
  {
    _id: {
      default: randomUUID,
      type: String,
    },
    algorithm: {
      default: "ES256",
      enum: ["RS256", "EdDSA", "ES256"],
      required: true,
      type: String,
    },
    counter: {
      default: 0,
      required: true,
      type: Number,
    },
    credentialId: {
      index: true,
      required: true,
      type: String,
      unique: true,
    },
    publicKey: {
      required: true,
      type: String,
    },
    transports: {
      default: [],
      enum: ["ble", "hybrid", "internal", "nfc", "usb", "smart-card"],
      type: [String],
    },
    userId: { required: true, type: String },
  },
  { timestamps: true },
);

export { PasskeySchema };
