import { importJWK } from "jose";
import { readFile } from "node:fs/promises";

export const createJwtKeys = async () => {
  const jwksPath = /** @type {string} */ (process.env.JWKS_PATH);
  const signingKid = /** @type {string} */ (process.env.JWT_SIGNING_KID);
  const { keys } = /** @type {{ keys: import("jose").JWK[] }} */ (
    JSON.parse(await readFile(jwksPath, "utf8"))
  );
  const signingJwk = keys.find(({ kid }) => kid === signingKid);
  const publicKeys = structuredClone(keys);

  if (!signingJwk?.d) {
    throw new Error(`JWT signing key ${signingKid} is unavailable`);
  }

  for (const key of publicKeys) {
    delete key.d;
  }

  return {
    jwks: { keys: publicKeys },
    signingKey: {
      kid: signingKid,
      privateKey: await importJWK(signingJwk, "ES256"),
    },
  };
};

/**
 * @typedef {Awaited<ReturnType<typeof createJwtKeys>>} JwtKeys
 */
