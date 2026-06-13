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
        code: "code" in err ? err.code : undefined,
        event: "database_idle_client_error",
        level: "error",
      }),
    );
  });

  return {
    close: () => pool.end(),
    db: pool,
  };
}
