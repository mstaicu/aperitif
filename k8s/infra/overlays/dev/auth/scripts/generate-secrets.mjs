// @ts-check
import fs from "node:fs/promises";
import { generateKeyPairSync, randomBytes } from "node:crypto";

console.log("🔑 Generating RSA key pair...");

var { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

await fs.writeFile("/secrets/access_token_private_key.pem", privateKey);
await fs.writeFile("/secrets/access_token_public_key.pem", publicKey);

console.log("🔑 Generating random refresh token secret...");

var refreshTokenSecret = randomBytes(32).toString("base64");
await fs.writeFile("/secrets/refresh_token_secret.txt", refreshTokenSecret);

console.log("✅ Secrets generated successfully!");
