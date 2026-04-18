import claim from "./admission.claim.mjs";
import create from "./admissions.create.mjs";
import get from "./admission.get.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../../../runtime/admissions/index.mjs").AdmissionsRuntime} AdmissionsRuntime
 */

/**
 * @param {Fastify} fastify
 * @param {{admissions: AdmissionsRuntime}} opts
 */
export default async function (fastify, { admissions }) {
  await fastify.register(create, { admissions });
  await fastify.register(get, { admissions });
  await fastify.register(claim, { admissions });
}
