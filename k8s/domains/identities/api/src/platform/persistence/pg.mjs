import nconf from "nconf";
import { Pool } from "pg";

export const createPgContext = () => {
  const pool = new Pool({
    connectionString: nconf.get("DATABASE_URL"),
    connectionTimeoutMillis: 2000,
    // https://node-postgres.com/apis/pool
    // max_connections on postgres = 100,
    //  minus 20 for other services = 80
    //  budget for identities-api = 80 * 75% = 60
    //  per identities-api replica = 60 / 3 replicas = 20
    max: 20,
    query_timeout: 2000,
    statement_timeout: 2000,
  });

  return {
    close: () => pool.end(),
    db: pool,
  };
};
