import { writeFileSync } from "fs";
import { generateKeyPairSync, randomBytes } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});
const refreshTokenSecret = randomBytes(32).toString("base64");

writeFileSync("/secrets/access_token_private_key.pem", privateKey);
writeFileSync("/secrets/access_token_public_key.pem", publicKey);
writeFileSync("/secrets/refresh_token_secret.txt", refreshTokenSecret);
