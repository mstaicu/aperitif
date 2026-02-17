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
 * @param {import("fastify").FastifyInstance} fastify
 */
export var routes = async (fastify) => {
  fastify.get("/.well-known/jwks.json", async (_, reply) =>
    reply.code(200).send({
      keys: [{ ...jwk, alg: "ES256", kid: "jwk-1", use: "sig" }],
    }),
  );
};
