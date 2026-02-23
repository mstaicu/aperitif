import fp from "fastify-plugin";
import nconf from "nconf";
import { Pool } from "pg";

export const pgPlugin = fp(async (fastify) => {
  const pool = new Pool({
    connectionString: nconf.get("DATABASE_URL"),
    connectionTimeoutMillis: 250,
    idleTimeoutMillis: 30000,
    // https://node-postgres.com/apis/pool
    // max_connections on postgres = 100,
    //  minus 20 for other services = 80
    //  budget for auth-api = 80 * 75% = 60
    //  per auth-api replica = 60 / 3 replicas = 20
    max: 20,
  });

  fastify.decorate("pool", pool);

  fastify.addHook("onClose", async () => {
    await pool.end();
  });
});
