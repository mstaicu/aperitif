import { connect } from "@nats-io/transport-node";
import nconf from "nconf";
import { Pool } from "pg";

import { startIdentitiesConsumer } from "./consumers/identities.mjs";

const pool = new Pool({
  connectionString: nconf.get("DATABASE_URL"),
  connectionTimeoutMillis: 2000,
  // https://node-postgres.com/apis/pool
  // max_connections on postgres = 100,
  //  minus 80 for identities-api = 20
  //  budget for identities-worker = 20 * 75% = 15
  //  per identities-worker replica = 15 / 3 replicas = 5
  max: 5,
});

const nc = await connect({
  name: "identities-worker",
  servers: [nconf.get("NATS_URL")],
});

const stopIdentitiesConsumer = await startIdentitiesConsumer(nc);

console.log("listening");

let shutdownInitiated = false;

["SIGINT", "SIGTERM", "SIGUSR2"].forEach((signal) =>
  process.on(signal, async () => {
    if (shutdownInitiated) return;
    shutdownInitiated = true;

    console.log("shutdown initiated");

    try {
      console.log("stopping identities consumer...");
      await stopIdentitiesConsumer();
    } catch (err) {
      console.error("error stopping identities consumer", err);
    }

    try {
      if (!nc.isClosed()) {
        console.log("draining nats...");
        await nc.drain();
        await nc.closed();
      }
    } catch (err) {
      console.error("error draining nats", err);
    }

    try {
      console.log("closing postgres pool...");
      await pool.end();
    } catch (err) {
      console.error("error closing pg pool", err);
    }

    console.log("shutdown complete");
    process.exit(0);
  }),
);
