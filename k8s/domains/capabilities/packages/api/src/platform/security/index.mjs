import { createRemoteJWKSet } from "jose";

export const createSecurityContext = () => {
  if (!process.env.IDENTITY_JWKS_URL) {
    throw new Error("IDENTITY_JWKS_URL is required");
  }

  const remotejwkSet = createRemoteJWKSet(
    new URL(process.env.IDENTITY_JWKS_URL),
  );

  return {
    jwks: remotejwkSet,
  };
};
