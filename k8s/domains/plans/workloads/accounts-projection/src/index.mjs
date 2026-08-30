import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { NodeSDK } from "@opentelemetry/sdk-node";

const requiredEnv = ["DATABASE_URL", "NATS_URL"];

for (const name of requiredEnv) {
  if (!process.env[name]) {
    throw new Error(`${name} is required`);
  }
}

if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT && !process.env.OTEL_SERVICE_NAME) {
  throw new Error("OTEL_SERVICE_NAME is required");
}

const otel = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  ? new NodeSDK({
      instrumentations: [new PgInstrumentation({ requireParentSpan: true })],
      serviceName: process.env.OTEL_SERVICE_NAME,
    })
  : undefined;

otel?.start();

try {
  await import("./server.mjs");
} finally {
  await otel?.shutdown();
}
