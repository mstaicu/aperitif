import { createRemoteJWKSet } from "jose";
import nconf from "nconf";

export const createSecurityContext = () => {
  const jwksUrl = nconf.get("IDENTITY_JWKS_URL");
  const remotejwkSet = createRemoteJWKSet(new URL(jwksUrl));

  return {
    jwks: remotejwkSet,
  };
};
