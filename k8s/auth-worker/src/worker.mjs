import { connect } from "@nats-io/transport-node";
import nconf from "nconf";
import { Pool } from "pg";

import { startAuthConsumer } from "./consumers/auth.mjs";

const pool = new Pool({
  connectionString: nconf.get("DATABASE_URL"),
  connectionTimeoutMillis: 250,
  idleTimeoutMillis: 30000,
  // https://node-postgres.com/apis/pool
  // max_connections on postgres = 100,
  //  minus 80 for auth-api = 20
  //  budget for auth-worker = 20 * 75% = 15
  //  per auth-worker replica = 15 / 3 replicas = 5
  max: 5,
});

const nc = await connect({
  name: "auth-api",
  pass: nconf.get("NATS_PASSWORD"),
  servers: [nconf.get("NATS_URL")],
  user: nconf.get("NATS_USER"),
});

const stopAuthConsumer = await startAuthConsumer(nc);

console.log("listening");

let shutdownInitiated = false;

["SIGINT", "SIGTERM", "SIGUSR2"].forEach((signal) =>
  process.on(signal, async () => {
    if (shutdownInitiated) return;
    shutdownInitiated = true;

    console.log("shutdown initiated");

    try {
      console.log("stopping auth consumer...");
      await stopAuthConsumer();
    } catch (err) {
      console.error("error stopping auth consumer", err);
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
