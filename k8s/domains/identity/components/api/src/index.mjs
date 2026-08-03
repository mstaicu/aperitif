import { FastifyOtelInstrumentation } from "@fastify/otel";
import { NodeSDK } from "@opentelemetry/sdk-node";

const requiredEnv = [
  "DATABASE_URL",
  "JWT_PRIVATE_KEY_PATH",
  "JWT_PUBLIC_KEY_PATH",
  "ORIGIN",
];

for (const name of requiredEnv) {
  if (!process.env[name]) {
    throw new Error(`${name} is required`);
  }
}

if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT && !process.env.OTEL_SERVICE_NAME) {
  throw new Error("OTEL_SERVICE_NAME is required");
}

try {
  new URL(/** @type {string} */ (process.env.ORIGIN));
} catch {
  throw new Error(`Invalid ORIGIN: ${process.env.ORIGIN}`);
}

const otel = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  ? new NodeSDK({
      instrumentations: [
        new FastifyOtelInstrumentation({
          ignorePaths: ({ url }) => url === "/livez" || url === "/readyz",
          registerOnInitialization: true,
        }),
      ],
      serviceName: process.env.OTEL_SERVICE_NAME,
    })
  : undefined;

otel?.start();

await import("./server.mjs");

await otel?.shutdown();
