import { createHash, randomBytes } from "node:crypto";

export function generateRefreshToken() {
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest();
  return { hash, token };
}
