import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { GenericContainer, Network, Wait } from "testcontainers";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const sqlPath = resolve(fixtureDir, "../../../database/sql");

/**
 * @returns {Promise<Pool & AsyncDisposable>}
 */
export const startPostgres = async () => {
  const stack = new AsyncDisposableStack();

  try {
    const network = stack.adopt(
      await new Network().start(),
      async (network) => {
        await network.stop();
      },
    );

    const postgres = stack.adopt(
      await new PostgreSqlContainer("postgres:18")
        .withNetwork(network)
        .withNetworkAliases("postgres")
        .start(),
      async (postgres) => {
        await postgres.stop();
      },
    );

    const flyway = await new GenericContainer("flyway/flyway:12.8.1")
      .withNetwork(network)
      .withBindMounts([
        {
          source: sqlPath,
          target: "/flyway/sql",
        },
      ])
      .withCommand([
        "-url=jdbc:postgresql://postgres:5432/test",
        "-user=test",
        "-password=test",
        "migrate",
      ])
      .withWaitStrategy(Wait.forOneShotStartup())
      .start();

    await flyway.stop().catch(() => {});

    const db = stack.adopt(
      new Pool({
        connectionString: postgres.getConnectionUri(),
      }),
      (db) => db.end(),
    );

    const resources = stack.move();

    return Object.assign(Object.create(db), {
      async [Symbol.asyncDispose]() {
        await resources.disposeAsync();
      },
    });
  } catch (err) {
    await stack.disposeAsync().catch(() => {});

    throw err;
  }
};
