import nconf from "nconf";
import { Pool } from "pg";

export const createPgContext = () => {
  const pool = new Pool({
    connectionString: nconf.get("DATABASE_URL"),
    connectionTimeoutMillis: 2000,
    max: 20,
    query_timeout: 2000,
    statement_timeout: 2000,
  });

  return {
    close: () => pool.end(),
    db: pool,
  };
};
