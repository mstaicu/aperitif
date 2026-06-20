import { exportJWK, generateKeyPair } from "jose";

export const createJwtFixture = async () => {
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  const publicJwk = await exportJWK(publicKey);

  /** @type {import("jose").JSONWebKeySet} */
  const jwks = {
    keys: [{ ...publicJwk, alg: "ES256", kid: "test", use: "sig" }],
  };

  return {
    jwks,
    signingKey: {
      kid: "test",
      privateKey,
    },
  };
};
