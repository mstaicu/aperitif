// @ts-check
import mongoose from "mongoose";
import nconf from "nconf";
import crypto from "node:crypto";

import { authDbConnection } from "../services/index.mjs";

/**
 * @description base64-encoded 32-byte key
 * @type {String}
 */
var ENCRYPTION_KEY = nconf.get("AUTH_REFRESH_TOKEN_ENCRYPTION_KEY");
var IV_LENGTH = 16;

/**
 * Encrypts the given text using AES-256-CBC.
 *
 * @param {String} text
 * @returns {String} Encrypted text in the format "iv:encrypted"
 */
function encrypt(text) {
  var iv = crypto.randomBytes(IV_LENGTH);
  var cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "base64"),
    iv
  );

  var encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 *
 * Decrypts the given text using AES-256-CBC.
 *
 * @param {String} text
 * @returns {String} Decrypted text
 */
function decrypt(text) {
  var [storedIv, encryptedText] = text.split(":");

  var iv = Buffer.from(storedIv, "hex");
  var encryptedBuffer = Buffer.from(encryptedText, "hex");

  var decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "base64"),
    iv
  );

  var decrypted = decipher.update(encryptedBuffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
}

var RefreshTokenSchema = new mongoose.Schema({
  content: {
    type: String,

    set: encrypt,
    get: decrypt,

    required: true,
    unique: true,
    index: true,
  },
  expireAt: { type: Date, required: true },
  user: { type: "ObjectId", required: true, ref: "User" },
});

RefreshTokenSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

var RefreshToken = authDbConnection.model("RefreshToken", RefreshTokenSchema);

export { RefreshToken };
