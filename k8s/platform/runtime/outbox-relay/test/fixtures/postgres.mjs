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
    CREATE TABLE outbox_events (
      id UUID PRIMARY KEY,
      subject TEXT NOT NULL,
      event JSONB NOT NULL,
      traceparent TEXT,
      tracestate TEXT,
      queued_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(
    `
      CREATE INDEX outbox_events_queued_at_id
      ON outbox_events (queued_at, id)
    `,
  );

  const resources = stack.move();

  return {
    pool,
    [Symbol.asyncDispose]: () => resources.disposeAsync(),
  };
};
