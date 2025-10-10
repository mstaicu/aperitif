import { Router } from "express";
import { exportJWK, importSPKI } from "jose";
import nconf from "nconf";
import { readFile } from "node:fs/promises";

const router = Router();

const jwk = await exportJWK(
  await importSPKI(
    await readFile(nconf.get("JWT_PUBLIC_KEY_PATH"), "utf-8"),
    "ES256",
  ),
);

const JWKS = {
  keys: [{ ...jwk, alg: "ES256", kid: "jwk-1", use: "sig" }],
};

router.get("/.well-known/jwks.json", (_, res) => res.status(200).json(JWKS));

export { router as jwksRouter };
