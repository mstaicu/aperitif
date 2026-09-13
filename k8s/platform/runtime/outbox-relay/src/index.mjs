import { NodeSDK } from "@opentelemetry/sdk-node";

const required = ["DATABASE_URL", "NATS_STREAMS_PATH", "NATS_URL"];

for (const envVar of required) {
  if (!process.env[envVar]) {
    throw new Error(`${envVar} is required`);
  }
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
