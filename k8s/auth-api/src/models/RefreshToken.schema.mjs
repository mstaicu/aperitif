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
      index: { expires: 0 },
      required: true,
      type: Date,
    },
    tokenHash: {
      required: true,
      set: hashText,
      type: String,
      unique: true,
    },
    userId: { required: true, type: String }, // base64url encoded user id
  },
  {
    timestamps: true,
  },
);

export { RefreshTokenSchema };

/**
 * 
 * Delete the provided token once issuing a different token pair
 * 
 * const refreshToken = sign({}, process.env.REFRESH_TOKEN_SECRET, {
    subject: userId,
    expiresIn: "30d",
  });

  await RefreshToken.create({
    tokenHash: refreshToken, // The `set` function will hash it automatically
    user: userId,
    expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  async function validateRefreshToken(refreshToken) {
  const hashedToken = createHash("sha256").update(refreshToken).digest("hex");

  const tokenEntry = await RefreshToken.findOne({ tokenHash: hashedToken });

  if (!tokenEntry) {
    throw new Error("Invalid or revoked token");
  }

  // Validate the token signature and claims
  const decoded = verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  return decoded.sub; // Return the user ID
}
 */
