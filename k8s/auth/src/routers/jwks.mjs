// @ts-check
import { Router } from "express";
import { exportJWK, importSPKI } from "jose";
import nconf from "nconf";

const router = Router();

// Convert PEM to JWK
var jwk = await exportJWK(
  await importSPKI(nconf.get("ACCESS_TOKEN_PUBLIC_KEY"), "RS256"),
);

router.get("/.well-known/jwks.json", async (_, res) => {
  // JSON Web Key Sets (JWKS)
  var jwks = {
    keys: [
      {
        ...jwk,
        alg: "RS256", // Algorithm used for signing
        kid: "key-id-1", // Key ID for this key (matches JWTs)
        use: "sig", // This key is for signing
      },
    ],
  };

  res.status(200).send(jwks);
});

export { router as jwksRouter };
