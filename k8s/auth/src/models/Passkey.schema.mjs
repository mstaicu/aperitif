// @ts-check
import mongoose from "mongoose";

var PasskeySchema = new mongoose.Schema(
  {
    user: { ref: "User", required: true, type: "ObjectId" },
  },
  { timestamps: true },
);

export { PasskeySchema };
