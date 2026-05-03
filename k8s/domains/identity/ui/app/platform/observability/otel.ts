import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { NodeSDK } from "@opentelemetry/sdk-node";

const ignoredPaths = new Set(["/healthz", "/readyz"]);

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
        ignoreIncomingRequestHook: (request) => {
          if (!request.url) return false;

          return ignoredPaths.has(
            new URL(request.url, "http://localhost").pathname,
          );
        },
      }),
      new UndiciInstrumentation(),
    ],
    serviceName,
  });

  otel.start();
}

async function shutdownOtel() {
  if (otel) {
    await otel.shutdown();
  }
}

["SIGINT", "SIGTERM"].forEach((signal) =>
  process.once(signal, () => {
    void shutdownOtel().catch(() => {
      process.exitCode = 1;
    });
  }),
);
