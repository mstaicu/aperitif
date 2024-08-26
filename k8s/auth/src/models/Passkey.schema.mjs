// @ts-check
import mongoose from "mongoose";

var PasskeySchema = new mongoose.Schema(
  {
    user: { type: "ObjectId", required: true, ref: "User" },
  },
  { timestamps: true }
);

export { PasskeySchema };
