import { importJWK } from "jose";
import { readFile } from "node:fs/promises";

/**
 * @param {{ jwksPath: string, signingKid: string }} options
 */
export const loadJwtKeys = async ({ jwksPath, signingKid }) => {
  const { keys } = /** @type {{ keys: import("jose").JWK[] }} */ (
    JSON.parse(await readFile(jwksPath, "utf8"))
  );

  if (keys.some(({ crv, kty }) => kty !== "EC" || crv !== "P-256")) {
    throw new Error("Only EC P-256 keys are supported");
  }

  const signingJwk = keys.find(({ kid }) => kid === signingKid);

  if (!signingJwk?.d) {
    throw new Error(`JWT signing key ${signingKid} is unavailable`);
  }

  const publicKeys = keys.map(({ crv, kid, kty, x, y }) => ({
    crv,
    kid,
    kty,
    x,
    y,
  }));

  return {
    jwks: { keys: publicKeys },
    signingKey: {
      kid: signingKid,
      privateKey: await importJWK(signingJwk, "ES256"),
    },
  };
};

/**
 * @typedef {Awaited<ReturnType<typeof loadJwtKeys>>} JwtKeys
 */
