import fp from "fastify-plugin";
import nconf from "nconf";
import { Pool } from "pg";

export const pgPlugin = fp(async (fastify) => {
  const max = Number(nconf.get("DB_POOL_MAX") || 20);

  const pool = new Pool({
    connectionString: nconf.get("DATABASE_URL"),
    connectionTimeoutMillis: 250,
    idleTimeoutMillis: 30000,
    // https://node-postgres.com/apis/pool
    // max_connections on postgres = 100, minus 20 for other services = 80 * 75% budget for auth-api = 60 / 3 = 20
    max,
  });

  fastify.decorate("pool", pool);

  fastify.addHook("onClose", async () => {
    await pool.end();
  });
});
