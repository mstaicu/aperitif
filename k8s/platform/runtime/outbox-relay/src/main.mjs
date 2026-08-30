import { jetstream } from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import process from "node:process";
import { Pool } from "pg";

import { relayOutbox } from "./outbox.mjs";

const required = ["DATABASE_URL", "NATS_STREAMS_PATH", "NATS_URL"];

for (const envVar of required) {
  if (!process.env[envVar]) {
    throw new Error(`${envVar} is required`);
  }
}

if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT && !process.env.OTEL_SERVICE_NAME) {
  throw new Error("OTEL_SERVICE_NAME is required");
}

const streamConfigurations = JSON.parse(
  await readFile(/** @type {string} */ (process.env.NATS_STREAMS_PATH), "utf8"),
);

if (
  !Array.isArray(streamConfigurations) ||
  streamConfigurations.some(
    (streamConfiguration) =>
      !streamConfiguration ||
      typeof streamConfiguration !== "object" ||
      typeof streamConfiguration.name !== "string",
  )
) {
  throw new Error(
    "NATS_STREAMS_PATH must contain stream configurations with names",
  );
}

const abortController = new AbortController();

for (const signal of ["SIGINT", "SIGTERM", "SIGUSR2"]) {
  process.once(signal, () => abortController.abort());
}

const otel = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  ? new NodeSDK({
      serviceName: process.env.OTEL_SERVICE_NAME,
    })
  : undefined;

otel?.start();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => console.error(err));

try {
  await using nc = await connect({
    maxReconnectAttempts: -1,
    name: "outbox-relay",
    servers: [/** @type {string} */ (process.env.NATS_URL)],
    timeout: 2_000,
  });
  const js = jetstream(nc);
  const jsm = await js.jetstreamManager();

  for (const streamConfiguration of streamConfigurations) {
    try {
      await jsm.streams.update(streamConfiguration.name, streamConfiguration);
    } catch (err) {
      if (!(err instanceof Error) || err.name !== "StreamNotFoundError") {
        throw err;
      }

      await jsm.streams.add(streamConfiguration);
    }
  }

  const healthServer = createServer(async (req, res) => {
    if (req.url === "/livez") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok");
      return;
    }

    if (req.url === "/readyz") {
      try {
        await pool.query("SELECT 1");
        await nc.flush();

        res.writeHead(200, { "content-type": "text/plain" });
        res.end("ok");
      } catch {
        res.writeHead(503, { "content-type": "text/plain" });
        res.end("not ready");
      }

      return;
    }

    res.writeHead(404, { "content-type": "text/plain" });
    res.end();
  });

  healthServer.listen(3000, "0.0.0.0");

  try {
    await relayOutbox({
      abortSignal: abortController.signal,
      js,
      pool,
    });
  } finally {
    await new Promise((resolve, reject) =>
      healthServer.close((err) => (err ? reject(err) : resolve(undefined))),
    );
  }
} finally {
  await pool.end();
  await otel?.shutdown();
}
