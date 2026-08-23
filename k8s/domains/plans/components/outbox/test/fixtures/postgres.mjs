import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { GenericContainer, Network, Wait } from "testcontainers";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const sqlPath = resolve(fixtureDir, "../../../migrations/sql");

export const startPostgres = async () => {
  await using stack = new AsyncDisposableStack();

  const network = stack.use(await new Network().start());

  const postgres = stack.use(
    await new PostgreSqlContainer("postgres:18")
      .withNetwork(network)
      .withNetworkAliases("postgres")
      .start(),
  );

  const flyway = await new GenericContainer("flyway/flyway:13.3.0")
    .withNetwork(network)
    .withBindMounts([{ source: sqlPath, target: "/flyway/sql" }])
    .withCommand([
      "-url=jdbc:postgresql://postgres:5432/test",
      "-user=test",
      "-password=test",
      "migrate",
    ])
    .withWaitStrategy(Wait.forOneShotStartup())
    .start();

  await flyway.stop().catch(() => {});

  const pool = new Pool({ connectionString: postgres.getConnectionUri() });

  stack.defer(() => pool.end());

  const resources = stack.move();

  return {
    pool,
    [Symbol.asyncDispose]: () => resources.disposeAsync(),
  };
};
