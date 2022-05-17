import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

/**
 *
 */
if (!process.env.MAGIC_LINK_PASSWORD) {
  throw new Error(
    "MAGIC_LINK_PASSWORD must be defined as an environment variable"
  );
}

let algorithm = "aes-256-ctr";
let encryptionKey = scryptSync(process.env.MAGIC_LINK_PASSWORD, "salt", 32);

/**
 *
 */
export function encryptMagicLinkPayload(magicLinkPayload: string) {
  let iv = randomBytes(16);

  let cipher = createCipheriv(algorithm, encryptionKey, iv);

  let encrypted = Buffer.concat([
    cipher.update(magicLinkPayload),
    cipher.final(),
  ]);

  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 *
 */
export function decryptMagicLinkPayload(encryptedMagicLinkPayload: string) {
  let [ivPart, encryptedPart] = encryptedMagicLinkPayload.split(":");

  if (!ivPart || !encryptedPart) {
    throw new Error("Invalid encrypted magic payload");
  }

  let iv = Buffer.from(ivPart, "hex");

  let encryptedText = Buffer.from(encryptedPart, "hex");

  let decipher = createDecipheriv(algorithm, encryptionKey, iv);

  let decrypted = Buffer.concat([
    decipher.update(encryptedText),
    decipher.final(),
  ]);

  return decrypted.toString();
}
