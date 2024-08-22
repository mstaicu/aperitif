import { randomBytes } from "crypto";
import { Schema } from "mongoose";

import { authDbConnection } from "../services/index.mjs";

var challengeSchema = new Schema({
  content: {
    type: String,
    required: true,
    /**
     * 32 characters in base64 represent 192 bits (32 * 6 = 192 bits)
     */
    default: () => randomBytes((32 * 6) / 8).toString("base64"),
    unique: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // 5 minutes (300 seconds)
  },
});

var Challenge = authDbConnection.model("Challenge", challengeSchema);

export { Challenge };
