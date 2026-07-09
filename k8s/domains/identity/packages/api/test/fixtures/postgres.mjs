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
  const network = await new Network().start();

  /** @type {import("@testcontainers/postgresql").StartedPostgreSqlContainer | undefined} */
  let postgres;

  /** @type {Pool | undefined} */
  let db;

  try {
    postgres = await new PostgreSqlContainer("postgres:18")
      .withNetwork(network)
      .withNetworkAliases("postgres")
      .start();

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

    db = new Pool({
      connectionString: postgres.getConnectionUri(),
    });

    return Object.assign(Object.create(db), {
      async [Symbol.asyncDispose]() {
        await db?.end().catch(() => {});
        await postgres?.stop().catch(() => {});
        await network.stop().catch(() => {});
      },
    });
  } catch (err) {
    await db?.end().catch(() => {});
    await postgres?.stop().catch(() => {});
    await network.stop().catch(() => {});

    throw err;
  }
};
