// import { connect } from "@nats-io/transport-node";
import nconf from "nconf";
import { Pool } from "pg";

import { buildApp } from "./app.mjs";

var pool = new Pool({
  connectionString: nconf.get("DATABASE_URL"),
  connectionTimeoutMillis: 250,
  idleTimeoutMillis: 30000,
  // https://node-postgres.com/apis/pool
  // max_connections on postgres = 100, minus 20 for other services = 80 * 75% budget for auth-api = 60 / 3 = 20
  max: 20,
});

// TODO: Env var?
// var servers = Array.from(Array(3)).map(
//   (_, index) =>
//     `nats://nats-depl-${index}.nats-headless.nats.svc.cluster.local:4222`,
// );

// var nc = await connect({
//   name: "auth-api",
//   servers,
// });

const app = await buildApp({
  pool,
});

app.addHook("onClose", async () => {
  // if (nc && !nc.isClosed()) {
  //   console.log("draining NATS...");
  //   try {
  //     await nc.drain();
  //   } catch {
  //     await nc.close();
  //   }
  // }

  await pool.end();
});

await app.listen({
  host: "0.0.0.0",
  port: 3000,
});
