import { exportJWK, importPKCS8, importSPKI } from "jose";
import { readFile } from "node:fs/promises";

const KID = "k1";

export const createSecurityContext = async () => {
  /**
   * @type {string}
   */
  const audience = process.env.ACCESS_TOKEN_AUDIENCE;

  if (!audience) {
    throw new Error("No ACCESS_TOKEN_AUDIENCE provided");
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

  return {
    audience,
    jwks: {
      keys: [{ ...publicJwk, alg: "ES256", kid: KID, use: "sig" }],
    },
    signing: {
      kid: KID,
      privateKey,
    },
    verifying: {
      publicKey,
    },
  };
};
