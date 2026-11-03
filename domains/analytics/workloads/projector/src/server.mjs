import { jetstream, jetstreamManager } from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";
import { once } from "node:events";
import { createServer } from "node:http";
import { Pool } from "pg";

import { identityConsumers, runConsumer } from "./consumers.mjs";
import { projectIdentityV1 } from "./identity-v1.mjs";

const abortController = new AbortController();
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => abortController.abort());
}
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000,
});
pool.on("error", (error) => {
  console.error(error);
  abortController.abort();
});
try {
  await using nc = await connect({
    maxReconnectAttempts: -1,
    name: "analytics-projector",
    servers: process.env.NATS_URL,
  });
  nc.closed().then(() => abortController.abort());
  const consumers = await identityConsumers({
    js: jetstream(nc),
    jsm: await jetstreamManager(nc),
    pool,
  });
  const health = createServer(async (request, response) => {
    if (request.url === "/livez") {
      response.writeHead(200).end("ok");
    } else if (request.url === "/readyz") {
      try {
        await pool.query("SELECT 1");
        await nc.flush();
        response
          .writeHead(abortController.signal.aborted ? 503 : 200)
          .end("ok");
      } catch {
        response.writeHead(503).end("not ready");
      }
    } else {
      response.writeHead(404).end();
    }
  });
  await once(health.listen(3000, "0.0.0.0"), "listening");
  try {
    const workers = consumers.map((consumer) =>
      runConsumer({
        consumer,
        handle: (message) => projectIdentityV1({ pool }, message),
        signal: abortController.signal,
      }),
    );
    try {
      await Promise.all(workers);
    } finally {
      abortController.abort();
      await Promise.allSettled(workers);
    }
  } finally {
    await nc.close();
    await health[Symbol.asyncDispose]();
  }
} catch (error) {
  // PostgreSQL error.detail can contain a rejected row. Report the failure
  // without logging raw event envelopes or driver detail fields.
  console.error({
    error: error instanceof Error ? error.message : "PROJECTOR_FAILED",
  });
  process.exitCode = 1;
} finally {
  await pool.end();
}
