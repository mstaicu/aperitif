import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { NodeSDK } from "@opentelemetry/sdk-node";

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
