import nconf from "nconf";
import { Pool } from "pg";

export function createPgContext() {
  const pool = new Pool({
    connectionString: nconf.get("DATABASE_URL"),
    connectionTimeoutMillis: 2000,
    max: 5,
    query_timeout: 5000,
    statement_timeout: 5000,
  });

  return {
    close: () => pool.end(),
    db: pool,
  };
}
