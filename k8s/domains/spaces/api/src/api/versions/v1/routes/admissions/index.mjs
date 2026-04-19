import claim from "./admission.claim.mjs";
import get from "./admission.get.mjs";
import create from "./admissions.create.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../../../runtime/admissions/index.mjs").AdmissionsRuntime} AdmissionsRuntime
 */

/**
 * @param {Fastify} fastify
 * @param {{admissions: AdmissionsRuntime, jwks: Jwks}} opts
 */
export default async function (fastify, { admissions, jwks }) {
  await fastify.register(create, { admissions, jwks });
  await fastify.register(get, { admissions, jwks });
  await fastify.register(claim, { admissions, jwks });
}
