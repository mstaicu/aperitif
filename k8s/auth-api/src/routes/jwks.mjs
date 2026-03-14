import { exportJWK, importSPKI } from "jose";
import nconf from "nconf";
import { readFile } from "node:fs/promises";

const JWT_KID = "k1";

const jwk = await exportJWK(
  await importSPKI(
    await readFile(nconf.get("JWT_PUBLIC_KEY_PATH"), "utf-8"),
    "ES256",
  ),
);

/**
 * @param {import('../fastify.js').Instance} fastify
 */
export const routes = async (fastify) => {
  fastify.get("/v1/.well-known/jwks.json", async (_, reply) => {
    reply.header("Cache-Control", "public, max-age=300, immutable");

    return reply.code(200).send({
      keys: [{ ...jwk, alg: "ES256", kid: JWT_KID, use: "sig" }],
    });
  });
};
