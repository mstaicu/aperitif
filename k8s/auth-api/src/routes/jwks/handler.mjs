import { exportJWK, importSPKI } from "jose";
import nconf from "nconf";
import { readFile } from "node:fs/promises";

var jwk = await exportJWK(
  await importSPKI(
    await readFile(nconf.get("JWT_PUBLIC_KEY_PATH"), "utf-8"),
    "ES256",
  ),
);

var JWKS = {
  keys: [{ ...jwk, alg: "ES256", kid: "jwk-1", use: "sig" }],
};

export var getJwksHandler =
  () =>
  /**
   * @type {import("express").RequestHandler}
   */
  (_, res) =>
    res.status(200).json(JWKS);
