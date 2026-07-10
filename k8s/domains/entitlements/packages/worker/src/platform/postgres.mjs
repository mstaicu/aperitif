import { Pool } from "pg";

export function createPostgres() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  pool.on("error", (err) => {
    console.error(
      JSON.stringify({
        event: "database_idle_client_error",
        level: "error",
        message: err.message,
      }),
    );
  });

  const close = () => pool.end();

  return {
    close,
    db: pool,
    [Symbol.asyncDispose]: close,
  };
}
