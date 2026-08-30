import { jetstream } from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import process from "node:process";
import { Pool } from "pg";

import { relayOutbox } from "./outbox.mjs";

const requiredEnvironmentVariables = [
  "DATABASE_URL",
  "NATS_STREAMS_PATH",
  "NATS_URL",
];

for (const environmentVariable of requiredEnvironmentVariables) {
  if (!process.env[environmentVariable]) {
    throw new Error(`${environmentVariable} is required`);
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

const telemetry = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  ? new NodeSDK({
      serviceName: process.env.OTEL_SERVICE_NAME,
    })
  : undefined;

telemetry?.start();

const databasePool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

databasePool.on("error", (err) => console.error(err));

try {
  await using natsConnection = await connect({
    maxReconnectAttempts: -1,
    name: "outbox-relay",
    servers: [/** @type {string} */ (process.env.NATS_URL)],
    timeout: 2_000,
  });
  const jetStream = jetstream(natsConnection);
  const jetStreamManager = await jetStream.jetstreamManager();

  for (const streamConfiguration of streamConfigurations) {
    try {
      await jetStreamManager.streams.update(
        streamConfiguration.name,
        streamConfiguration,
      );
    } catch (err) {
      if (!(err instanceof Error) || err.name !== "StreamNotFoundError") {
        throw err;
      }

      await jetStreamManager.streams.add(streamConfiguration);
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
        await databasePool.query("SELECT 1");
        await natsConnection.flush();

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
      databasePool,
      jetStream,
    });
  } finally {
    await new Promise((resolve, reject) =>
      healthServer.close((err) => (err ? reject(err) : resolve(undefined))),
    );
  }
} finally {
  await databasePool.end();
  await telemetry?.shutdown();
}
