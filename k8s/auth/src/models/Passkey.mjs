// @ts-check
import mongoose from "mongoose";

import { authDbConnection } from "../services/index.mjs";

var PasskeySchema = new mongoose.Schema(
  {
    user: { type: "ObjectId", required: true, ref: "User" },
  },
  { timestamps: true }
);

var Passkey = authDbConnection.model("Passkey", PasskeySchema);

export { Passkey };
