import { jetstream, jetstreamManager } from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";
import { exportJWK, importPKCS8, importSPKI } from "jose";
import nconf from "nconf";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

/**
 * @typedef {object} Context
 * @property {Pool} db
 * @property {{
 *   region: string,
 *   origin: string,
 * }} conf
 * @property {{
 *   issuer: string,
 *   kid: string,
 *   privateKey: CryptoKey,
 *   jwks: { keys: import("jose").JWK[] },
 * }} jwt
 * @property {() => Promise<void>} close
 */

export const createNatsContext = async () => {
  const nc = await connect({
    name: "auth-api",
    servers: nconf.get("NATS_URL"),
  });

  const jsm = await jetstreamManager(nc);

  // max_bytes, retention, and discard
  // work together to define how
  // your stream behaves when it reaches capacity.
  try {
    await jsm.streams.add({
      discard: "old",
      max_bytes: Math.pow(1024, 3) * 1, // 1GiB
      name: "auth",
      num_replicas: 3,
      retention: "limits",
      storage: "file",
      subjects: ["auth.>"],
    });
  } catch {
    //
  }

  return {
    close: () => (nc.isClosed() ? Promise.resolve() : nc.drain()),
    js: jetstream(nc),
  };
};

const createPgContext = () => {
  const pool = new Pool({
    connectionString: nconf.get("DATABASE_URL"),
    connectionTimeoutMillis: 2000,
    // https://node-postgres.com/apis/pool
    // max_connections on postgres = 100,
    //  minus 20 for other services = 80
    //  budget for auth-api = 80 * 75% = 60
    //  per auth-api replica = 60 / 3 replicas = 20
    max: 20,
  });

  return {
    close: () => pool.end(),
    db: pool,
  };
};

/**
 * @param {string} origin
 */
const createJwtContext = async (origin) => {
  const privatePem = await readFile(nconf.get("JWT_PRIVATE_KEY_PATH"), "utf8");
  const publicPem = await readFile(nconf.get("JWT_PUBLIC_KEY_PATH"), "utf8");

  const privateKey = await importPKCS8(privatePem, "ES256");
  const publicJwk = await importSPKI(publicPem, "ES256").then(exportJWK);

  return {
    issuer: origin,
    jwks: {
      keys: [{ ...publicJwk, alg: "ES256", kid: "k1", use: "sig" }],
    },
    kid: "k1",
    privateKey,
  };
};

/**
 * @returns {Promise<Context>}
 */
export const createContext = async () => {
  const { origin } = new URL(nconf.get("ORIGIN"));

  const jwt = await createJwtContext(origin);
  // const nats = await createNatsContext();
  const pg = createPgContext();

  return {
    // close: () => Promise.allSettled([pg.close(), nats.close()]),
    close: () => pg.close(),
    conf: {
      origin,
      region: nconf.get("REGION") ?? "local",
    },
    db: pg.db,
    jwt,
    // js: nats.js,
  };
};
