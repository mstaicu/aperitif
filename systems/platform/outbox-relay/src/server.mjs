import {
  JetStreamApiCodes,
  JetStreamApiError,
  jetstreamManager,
} from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { Pool } from "pg";

import { runOutboxRelay } from "./relay.mjs";

const streamConfigs = JSON.parse(
  await readFile(/** @type {string} */ (process.env.NATS_STREAMS_PATH), "utf8"),
);

if (
  !Array.isArray(streamConfigs) ||
  streamConfigs.some((config) => typeof config?.name !== "string")
) {
  throw new Error(
    "NATS_STREAMS_PATH must contain stream configurations with names",
  );
}

const shutdown = new AbortController();

for (const signal of ["SIGINT", "SIGTERM", "SIGUSR2"]) {
  process.once(signal, () => shutdown.abort());
}

const nc = await connect({
  name: "outbox-relay",
  servers: /** @type {string} */ (process.env.NATS_URL),
});

nc.closed().then((error) => {
  if (error) {
    console.error(error);
    process.exitCode = 1;
  }

  shutdown.abort();
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 3000,
  query_timeout: 7000,
  statement_timeout: 5000,
});
pool.on("error", (error) => console.error(error));

const healthServer = createServer(async (req, res) => {
  res.setHeader("content-type", "text/plain");

  if (req.url === "/livez") return res.end("ok");
  if (req.url !== "/readyz") return res.writeHead(404).end();

  try {
    await Promise.all([pool.query("SELECT 1"), nc.rtt()]);
    res.end("ok");
  } catch {
    res.writeHead(503).end("not ready");
  }
});

try {
  const jsm = await jetstreamManager(nc);

  for (const config of streamConfigs) {
    try {
      await jsm.streams.update(config.name, config);
    } catch (error) {
      if (
        !(error instanceof JetStreamApiError) ||
        error.code !== JetStreamApiCodes.StreamNotFound
      ) {
        throw error;
      }

      await jsm.streams.add(config);
    }
  }

  await once(healthServer.listen(3000, "0.0.0.0"), "listening");
  await runOutboxRelay({ jsm, pool, signal: shutdown.signal });
} finally {
  await Promise.all([
    nc.close(),
    pool.end(),
    healthServer.listening && healthServer[Symbol.asyncDispose](),
  ]);
}
