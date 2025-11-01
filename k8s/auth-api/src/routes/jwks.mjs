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

export var getJwksRoute = () => {
  /**
   * @type {import("express").RequestHandler}
   */
  var handler = (_, res) => res.status(200).json(JWKS);

  return {
    handlers: [handler],
    method: "get",
    openapi: {
      responses: {
        200: { description: "JSON Web Key Set" },
      },
      summary: "JWKS endpoint",
      tags: ["security"],
    },
    path: "/.well-known/jwks.json",
  };
};
