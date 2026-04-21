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
    query_timeout: 2000,
    statement_timeout: 2000,
  });

  return {
    close: () => pool.end(),
    db: pool,
  };
};

const createSecurityContext = () => {
  const jwksUrl = nconf.get("AUTH_JWKS_URL");
  const remotejwkSet = createRemoteJWKSet(new URL(jwksUrl));

  return {
    jwks: remotejwkSet,
  };
};

export const createContext = async () => {
  const pg = createPgContext();
  const security = createSecurityContext();

  return {
    app: {
      region: nconf.get("REGION") ?? "local",
    },
    lifecycle: {
      close: () => pg.close(),
    },
    messaging: {},
    persistence: {
      db: pg.db,
    },
    security,
  };
};

/**
 * @typedef {Awaited<ReturnType<typeof createContext>>} Context
 */
