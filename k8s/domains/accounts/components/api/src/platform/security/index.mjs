import { createRemoteJWKSet } from "jose";

export const createIdentityJwks = () => {
  if (!process.env.IDENTITY_JWKS_URL) {
    throw new Error("IDENTITY_JWKS_URL is required");
  }

  return createRemoteJWKSet(new URL(process.env.IDENTITY_JWKS_URL));
};

/**
 * @typedef {ReturnType<typeof createIdentityJwks>} IdentityJwks
 */
