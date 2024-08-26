// @ts-check
import mongoose from "mongoose";
import { randomBytes } from "node:crypto";

import { authDbConnection } from "../services/index.mjs";

var challengeSchema = new mongoose.Schema({
  content: {
    type: String,
    /**
     * 32 characters in base64 represent 192 bits (32 * 6 = 192 bits)
     */
    default: () => randomBytes((32 * 6) / 8).toString("base64"),
    unique: true,
    index: true,
  },
  /**
   * if 'createdAt' is set, then document expires at createdAt + 'expires' seconds
   */
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60,
  },
});

var Challenge = authDbConnection.model("Challenge", challengeSchema);

export { Challenge };
