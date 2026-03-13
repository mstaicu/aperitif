import fp from "fastify-plugin";
import nconf from "nconf";
import { Pool } from "pg";

export const pgPlugin = fp(async (fastify) => {
  const pool = new Pool({
    connectionString: nconf.get("DATABASE_URL"),
    connectionTimeoutMillis: 500,
    idleTimeoutMillis: 30000,
    // https://node-postgres.com/apis/pool
    // max_connections on postgres = 100,
    //  minus 20 for other services = 80
    //  budget for auth-api = 80 * 75% = 60
    //  per auth-api replica = 60 / 3 replicas = 20
    max: 20,
  });

  // pool.on("connect", async (client) => {
  //   try {
  //     await client.query("SET statement_timeout = '1500ms'");
  //     await client.query("SET lock_timeout = '250ms'");
  //     await client.query("SET idle_in_transaction_session_timeout = '5s'");
  //   } catch (err) {
  //     fastify.log.error({ err }, "pg: failed to configure session defaults");
  //   }
  // });

  // await pool.query("SELECT 1");
  fastify.decorate("pool", pool);

  fastify.addHook("onClose", async () => {
    await pool.end();
  });
});
