import { NodeSDK } from "@opentelemetry/sdk-node";

const requiredEnv = [
  "DATABASE_URL",
  "NATS_STREAM_MAX_AGE_NANOS",
  "NATS_STREAM_MAX_BYTES",
  "NATS_STREAM_REPLICAS",
  "NATS_URL",
];

for (const name of requiredEnv) {
  if (!process.env[name]) {
    throw new Error(`${name} is required`);
  }
}

const streamMaxAge = Number(process.env.NATS_STREAM_MAX_AGE_NANOS);

if (!Number.isSafeInteger(streamMaxAge) || streamMaxAge <= 0) {
  throw new Error("NATS_STREAM_MAX_AGE_NANOS must be a positive integer");
}

const streamMaxBytes = Number(process.env.NATS_STREAM_MAX_BYTES);

if (!Number.isSafeInteger(streamMaxBytes) || streamMaxBytes <= 0) {
  throw new Error("NATS_STREAM_MAX_BYTES must be a positive integer");
}

if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT && !process.env.OTEL_SERVICE_NAME) {
  throw new Error("OTEL_SERVICE_NAME is required");
}

const otel = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  ? new NodeSDK({
      serviceName: process.env.OTEL_SERVICE_NAME,
    })
  : undefined;

otel?.start();

try {
  await import("./server.mjs");
} finally {
  await otel?.shutdown();
}
