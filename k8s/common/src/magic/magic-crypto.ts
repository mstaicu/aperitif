import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

/**
 * TODO: Add env var for magic link encryption password
 */
let PASSWORD = "V>84(%F@U8>q!&W'6T:'xmx4TsU2rAn@Fm'-{[6bW=6p-efy8c";

let algorithm = "aes-256-ctr";
let encryptionKey = scryptSync(PASSWORD, "salt", 32);

export function encryptMagicLinkPayload(magicLinkPayload: string) {
  let iv = randomBytes(16);

  let cipher = createCipheriv(algorithm, encryptionKey, iv);

  let encrypted = Buffer.concat([
    cipher.update(magicLinkPayload),
    cipher.final(),
  ]);

  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

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
