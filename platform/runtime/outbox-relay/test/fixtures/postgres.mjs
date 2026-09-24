import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";

export const startPostgres = async () => {
  await using stack = new AsyncDisposableStack();

  const postgres = stack.use(
    await new PostgreSqlContainer("postgres:18").start(),
  );
  const pool = new Pool({
    connectionString: postgres.getConnectionUri(),
  });

  stack.defer(() => pool.end());

  await pool.query(`
    CREATE TABLE outbox_messages (
      id UUID PRIMARY KEY,
      subject TEXT NOT NULL CHECK (subject <> ''),
      payload JSONB NOT NULL,
      headers JSONB NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(headers) = 'object'),
      queued_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX outbox_messages_queued_at_id
    ON outbox_messages (queued_at, id);
  `);

  const resources = stack.move();

  return {
    pool,
    [Symbol.asyncDispose]: () => resources.disposeAsync(),
  };
};
