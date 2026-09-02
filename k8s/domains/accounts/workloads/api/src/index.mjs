import { FastifyOtelInstrumentation } from "@fastify/otel";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { PinoInstrumentation } from "@opentelemetry/instrumentation-pino";
import { NodeSDK } from "@opentelemetry/sdk-node";

const requiredEnv = ["DATABASE_URL"];

for (const name of requiredEnv) {
  if (!process.env[name]) {
    throw new Error(`${name} is required`);
  }
}

if (
  Boolean(process.env.AUTH_JWKS_URL) === Boolean(process.env.AUTH_JWKS_FILE)
) {
  throw new Error("exactly one of AUTH_JWKS_URL or AUTH_JWKS_FILE is required");
}

if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT && !process.env.OTEL_SERVICE_NAME) {
  throw new Error("OTEL_SERVICE_NAME is required");
}

const otel = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  ? new NodeSDK({
      instrumentations: [
        new HttpInstrumentation({
          ignoreIncomingRequestHook: (request) =>
            request.url === "/livez" || request.url === "/readyz",
        }),
        new FastifyOtelInstrumentation({
          ignorePaths: ({ url }) => url === "/livez" || url === "/readyz",
          instrumentHooks: false,
          registerOnInitialization: true,
        }),
        new PgInstrumentation({ requireParentSpan: true }),
        new PinoInstrumentation({
          disableLogSending: true,
        }),
      ],
      serviceName: process.env.OTEL_SERVICE_NAME,
    })
  : undefined;

otel?.start();

try {
  await import("./server.mjs");
} finally {
  await otel?.shutdown();
}
