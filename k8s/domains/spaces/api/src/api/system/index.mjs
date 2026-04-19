import probes from "../probes/index.mjs";

/**
 * @typedef { import("pg").Pool } Db
 */

/**
 * @param {import("fastify").FastifyInstance} fastify
 * @param {{db: Db}} opts
 */
export default async (fastify, { db }) => {
  await fastify.register(probes, { db });
};
