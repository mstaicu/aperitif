// @ts-check
import { Schema } from "mongoose";
import { createHash, randomUUID } from "node:crypto";

/**
 * Generates a hash for the given text using SHA-256.
 *
 * @param {String} text - The text to hash.
 * @returns {String} The resulting hash.
 */
var hashText = (text) => createHash("sha256").update(text).digest("hex");

var RefreshTokenSchema = new Schema(
  {
    _id: {
      default: randomUUID,
      type: String,
    },
    expireAt: {
      expires: 0,
      required: true,
      type: Date,
    },
    tokenHash: {
      required: true,
      set: hashText,
      type: String,
      unique: true,
    },
    user: {
      ref: "User",
      required: true,
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

export { RefreshTokenSchema };
