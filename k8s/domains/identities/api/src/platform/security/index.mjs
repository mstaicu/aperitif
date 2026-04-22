import { exportJWK, importPKCS8, importSPKI } from "jose";
import nconf from "nconf";
import { readFile } from "node:fs/promises";

const KID = "k1";

export const createSecurityContext = async () => {
  /**
   * @type {string}
   */
  const rawAllowedAudiences = nconf.get("JWT_ALLOWED_AUDIENCES");

  const allowedAudiences = rawAllowedAudiences
    .split(",")
    .map((audience) => audience.trim())
    .filter(Boolean);

  if (!allowedAudiences.length) {
    throw new Error("No JWT_ALLOWED_AUDIENCES provided");
  }

  const [privatePem, publicPem] = await Promise.all([
    readFile(nconf.get("JWT_PRIVATE_KEY_PATH"), "utf8"),
    readFile(nconf.get("JWT_PUBLIC_KEY_PATH"), "utf8"),
  ]);

  const [privateKey, publicJwk] = await Promise.all([
    importPKCS8(privatePem, "ES256"),
    importSPKI(publicPem, "ES256").then(exportJWK),
  ]);

  return {
    allowedAudiences,
    jwks: {
      keys: [{ ...publicJwk, alg: "ES256", kid: KID, use: "sig" }],
    },
    signing: {
      kid: KID,
      privateKey,
    },
  };
};
