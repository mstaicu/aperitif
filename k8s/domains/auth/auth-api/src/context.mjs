import { jetstream, jetstreamManager } from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";
import nconf from "nconf";
import { Pool } from "pg";

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

export const createContext = async () => {
  const pg = createPgContext();
  // const nats = await createNatsContext();

  return {
    // close: () => Promise.allSettled([pg.close(), nats.close()]),
    close: () => Promise.allSettled([pg.close()]),
    conf: {
      jwtPrivateKeyPath: nconf.get("JWT_PRIVATE_KEY_PATH"),
      jwtPublicKeyPath: nconf.get("JWT_PUBLIC_KEY_PATH"),
      origin: nconf.get("ORIGIN"),
    },
    db: pg.db,
    // js: nats.js,
    // region: nconf.get("REGION") ?? "dev", // CHANGE THIS
  };
};
