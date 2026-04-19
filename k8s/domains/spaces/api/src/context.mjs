import { createRemoteJWKSet } from "jose";
import nconf from "nconf";
import { Pool } from "pg";

const createPgContext = () => {
  const pool = new Pool({
    connectionString: nconf.get("DATABASE_URL"),
    connectionTimeoutMillis: 2000,
    // https://node-postgres.com/apis/pool
    // max_connections on postgres = 100,
    //  minus 20 for other services = 80
    //  budget for spaces-api = 80 * 75% = 60
    //  per spaces-api replica = 60 / 3 replicas = 20
    max: 20,
  });

  return {
    close: () => pool.end(),
    db: pool,
  };
};

export const createContext = async () => {
  const pg = createPgContext();

  return {
    app: {
      region: nconf.get("REGION") ?? "local",
    },
    data: {
      db: pg.db,
    },
    lifecycle: {
      close: () => pg.close(),
    },
    security: {
      jwks: createRemoteJWKSet(new URL(nconf.get("AUTH_JWKS_URL"))),
    },
  };
};

/**
 * @typedef {Awaited<ReturnType<typeof createContext>>} Context
 */
