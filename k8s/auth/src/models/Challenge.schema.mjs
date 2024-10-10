// @ts-check
import mongoose from "mongoose";
import { randomBytes } from "node:crypto";

var ChallengeSchema = new mongoose.Schema({
  content: {
    /**
     * 32 characters in base64 represent 192 bits (32 * 6 = 192 bits)
     */
    default: () => randomBytes((32 * 6) / 8).toString("base64"),
    index: true,
    type: String,
    unique: true,
  },
  /**
   * if 'createdAt' is set, then document expires at createdAt + 'expires' seconds
   */
  createdAt: {
    default: Date.now,
    expires: 60,
    type: Date,
  },
});

export { ChallengeSchema };
