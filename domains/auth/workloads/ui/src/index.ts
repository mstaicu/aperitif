import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { NodeSDK } from "@opentelemetry/sdk-node";

if (!process.env.API_INTERNAL_V1_URL) {
  throw new Error("API_INTERNAL_V1_URL is required");
}

const apiUrl = new URL(process.env.API_INTERNAL_V1_URL);

if (!["http:", "https:"].includes(apiUrl.protocol)) {
  throw new Error("API_INTERNAL_V1_URL must use HTTP or HTTPS");
}

const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

let otel: NodeSDK | undefined;

if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  const serviceName = process.env.OTEL_SERVICE_NAME;

  if (!serviceName) {
    throw new Error(
      "OTEL_SERVICE_NAME is required when OTEL_EXPORTER_OTLP_ENDPOINT is set",
    );
  }

  otel = new NodeSDK({
    instrumentations: [
      new HttpInstrumentation({
        disableOutgoingRequestInstrumentation: true,
        ignoreIncomingRequestHook: (request) =>
          request.url?.split("?", 1)[0] === "/livez" ||
          request.url?.split("?", 1)[0] === "/readyz",
      }),
      new UndiciInstrumentation(),
    ],
    serviceName,
  });

  otel.start();
}

try {
  await import("./server.ts");
} finally {
  await otel?.shutdown();
}
