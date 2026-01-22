import { exportJWK, importSPKI } from "jose";
import nconf from "nconf";
import { readFile } from "node:fs/promises";

var jwk = await exportJWK(
  await importSPKI(
    await readFile(nconf.get("JWT_PUBLIC_KEY_PATH"), "utf-8"),
    "ES256",
  ),
);

/**
 * @param {import("mongoose").Connection} mc
 * @param {import("@nats-io/transport-node").NatsConnection} nc
 * @returns {import("express").RequestHandler}
 */
export var getJwksHandler = () => (_, res) =>
  res.status(200).json({
    keys: [{ ...jwk, alg: "ES256", kid: "jwk-1", use: "sig" }],
  });
