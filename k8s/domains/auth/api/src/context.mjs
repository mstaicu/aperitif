import { jetstream, jetstreamManager } from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";
import { exportJWK, importPKCS8, importSPKI } from "jose";
import nconf from "nconf";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

// eslint-disable-next-line
const createNatsContext = async () => {
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

const createSecurityContext = async () => {
  const jwtPrivateKeyPath = nconf.get("JWT_PRIVATE_KEY_PATH");
  const jwtPublicKeyPath = nconf.get("JWT_PUBLIC_KEY_PATH");
  /**
   * @type {string}
   */
  const rawAllowedAudiences = nconf.get("JWT_ALLOWED_AUDIENCES");

  const allowedAudiences = rawAllowedAudiences
    .split(",")
    .map((audience) => audience.trim())
    .filter(Boolean);

  if (!allowedAudiences.length) {
    throw new Error("No JWT_ALLOWED_AUDIENCES provided");
  }

  const kid = "k1";

  const privatePem = await readFile(jwtPrivateKeyPath, "utf8");
  const publicPem = await readFile(jwtPublicKeyPath, "utf8");

  const privateKey = await importPKCS8(privatePem, "ES256");
  const publicJwk = await importSPKI(publicPem, "ES256").then(exportJWK);

  return {
    allowedAudiences,
    jwks: {
      keys: [{ ...publicJwk, alg: "ES256", kid, use: "sig" }],
    },
    signing: {
      kid,
      privateKey,
    },
  };
};

export const createContext = async () => {
  const pg = createPgContext();
  const security = await createSecurityContext();
  // const nats = await createNatsContext(config);

  return {
    app: {
      origin: nconf.get("ORIGIN"),
      region: nconf.get("REGION") ?? "local",
    },
    data: {
      db: pg.db,
    },
    lifecycle: {
      // close: () => Promise.allSettled([pg.close(), nats.close()]),
      close: () => pg.close(),
    },
    security,
    // js: nats.js,
  };
};

/**
 * @typedef {Awaited<ReturnType<typeof createContext>>} Context
 */
