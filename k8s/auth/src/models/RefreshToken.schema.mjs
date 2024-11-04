// @ts-check
import mongoose from "mongoose";
import nconf from "nconf";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID,
} from "node:crypto";

/**
 * @description base64-encoded 32-byte key
 * @type {String}
 */
var ENCRYPTION_KEY = nconf.get("AUTH_REFRESH_TOKEN_ENCRYPTION_KEY");
// var ENCRYPTION_KEY = randomBytes(32).toString("base64");
var IV_LENGTH = 16;

if (!ENCRYPTION_KEY || Buffer.from(ENCRYPTION_KEY, "base64").length !== 32) {
  throw new Error("Invalid encryption key length. Must be 32 bytes in base64.");
}

/**
 * Encrypts the given text using AES-256-CBC.
 *
 * @param {String} text
 * @returns {String} Encrypted text in the format "iv:encrypted"
 */
function encrypt(text) {
  var iv = randomBytes(IV_LENGTH);
  var cipher = createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "base64"),
    iv,
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

  var decipher = createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "base64"),
    iv,
  );

  var decrypted = decipher.update(encryptedBuffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
}

var RefreshTokenSchema = new mongoose.Schema(
  {
    _id: {
      default: randomUUID,
      type: String,
    },
    content: {
      get: decrypt,

      index: true,
      required: true,

      set: encrypt,
      type: String,
      unique: true,
    },
    /**
     * if 'expireAt' is set, then document expires at expireAt + 'expires' seconds
     */
    expireAt: { expires: 0, required: true, type: Date },
    user: { ref: "User", required: true, type: String },
  },
  { timestamps: true },
);

export { RefreshTokenSchema };
