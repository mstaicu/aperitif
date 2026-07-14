import { Pool } from "pg";

export const createPostgres = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  pool.on("error", (err) => console.error(err));

  return {
    close: () => pool.end(),
    db: pool,
  };
};
