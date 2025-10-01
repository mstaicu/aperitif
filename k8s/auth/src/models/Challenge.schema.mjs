// @ts-check
import { Schema } from "mongoose";
import { randomBytes, randomUUID } from "node:crypto";

var ChallengeSchema = new Schema({
  _id: {
    default: randomUUID,
    type: String,
  },
  content: {
    /**
     * 32 characters in base64 represent 192 bits (32 * 6 = 192 bits)
     */
    default: () => randomBytes((32 * 6) / 8).toString("base64url"),
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
