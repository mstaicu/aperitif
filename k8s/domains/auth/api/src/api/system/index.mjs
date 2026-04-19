import jwks from "../jwks/index.mjs";
import probes from "../probes/index.mjs";

/**
 * @typedef { import("pg").Pool } Db
 * @typedef {{ keys: import("jose").JWK[] }} Jwks
 */

/**
 * @param {import("fastify").FastifyInstance} fastify
 * @param {{db: Db, jwks: Jwks}} opts
 */
export default async (fastify, { db, jwks: publicJwks }) => {
  await fastify.register(probes, { db });
  await fastify.register(jwks, { jwks: publicJwks });
};
