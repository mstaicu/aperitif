import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { GenericContainer, Network, Wait } from "testcontainers";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const migrationsPath = resolve(fixtureDir, "../../../migrate/migrations");

/**
 * @param {import("node:test").TestContext} t
 */
export const startPostgres = async (t) => {
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
          source: migrationsPath,
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

    t.after(async () => {
      await db?.end();
      await postgres?.stop();
      await network.stop();
    });

    return db;
  } catch (err) {
    await db?.end().catch(() => {});
    await postgres?.stop().catch(() => {});
    await network.stop().catch(() => {});

    throw err;
  }
};
