import { createRemoteJWKSet } from "jose";

export const createSecurityContext = () => {
  const jwksUrl = process.env.IDENTITY_JWKS_URL;
  const remotejwkSet = createRemoteJWKSet(new URL(jwksUrl));

  return {
    jwks: remotejwkSet,
  };
};
