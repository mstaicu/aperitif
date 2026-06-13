import { Pool } from "pg";

export const createPostgres = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
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
