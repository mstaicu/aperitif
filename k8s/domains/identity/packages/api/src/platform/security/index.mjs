import { exportJWK, importPKCS8, importSPKI } from "jose";
import { readFile } from "node:fs/promises";

export const createSecurityContext = async () => {
  if (!process.env.JWT_PRIVATE_KEY_PATH) {
    throw new Error("JWT_PRIVATE_KEY_PATH is required");
  }

  if (!process.env.JWT_PUBLIC_KEY_PATH) {
    throw new Error("JWT_PUBLIC_KEY_PATH is required");
  }

  const [privatePem, publicPem] = await Promise.all([
    readFile(process.env.JWT_PRIVATE_KEY_PATH, "utf8"),
    readFile(process.env.JWT_PUBLIC_KEY_PATH, "utf8"),
  ]);

  const [privateKey, publicKey] = await Promise.all([
    importPKCS8(privatePem, "ES256"),
    importSPKI(publicPem, "ES256"),
  ]);
  const publicJwk = await exportJWK(publicKey);

  /** @type {import("jose").JSONWebKeySet} */
  const jwks = {
    keys: [{ ...publicJwk, alg: "ES256", kid: "k1", use: "sig" }],
  };

  return {
    jwks,
    signingKey: {
      kid: "k1",
      privateKey,
    },
  };
};
