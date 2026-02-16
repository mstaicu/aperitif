// import { connect } from "@nats-io/transport-node";
import express from "express";
import graceful from "graceful-http";
import nconf from "nconf";
import { Pool } from "pg";

import {
  getHealthzHandler,
  getJwksHandler,
  getOpenApiHandler,
  getReadyzHandler,
  getRegistrationChallengeHandler,
} from "./routes/index.mjs";

var pool = new Pool({
  connectionString: nconf.get("DATABASE_URL"),
});
// await pool.query("SELECT 1");

// var servers = Array.from(Array(3)).map(
//   (_, index) =>
//     `nats://nats-depl-${index}.nats-headless.nats.svc.cluster.local:4222`,
// );

// var nc = await connect({
//   name: "auth-api",
//   servers,
// });

var PORT = 3000;

var app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "20kb", strict: true }));

app.get("/healthz", getHealthzHandler());
app.get("/readyz", getReadyzHandler(pool));

app.get("/openapi.json", getOpenApiHandler());
app.get("/.well-known/jwks.json", getJwksHandler());

// app.use((_, res, next) =>
//   connection.readyState !== 1 || nc.isClosed() ? res.sendStatus(503) : next(),
// );

app.post(
  "/webauthn/registration/challenge",
  getRegistrationChallengeHandler(pool),
);

var close = graceful(
  app.listen(PORT, () => console.log(`listening on port ${PORT}`)),
);

var shutdownInitiated = false;

["SIGINT", "SIGTERM", "SIGUSR2"].forEach((signal) =>
  process.on(signal, async () => {
    if (shutdownInitiated) return;

    shutdownInitiated = true;

    console.log("closing server connections...");
    await close();

    console.log("closing postgres pool...");
    await pool.end();

    // if (nc && !nc.isClosed()) {
    //   console.log("draining NATS...");
    //   try {
    //     await nc.drain();
    //   } catch {
    //     await nc.close();
    //   }
    // }

    console.log("shutdown complete");

    process.exit(0);
  }),
);
