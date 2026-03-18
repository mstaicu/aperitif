import pgMigrate from "node-pg-migrate";

await pgMigrate({
  databaseUrl: process.env.DATABASE_URL,
  dir: "/migrations",
  migrationsTable: "pgmigrations",
});
