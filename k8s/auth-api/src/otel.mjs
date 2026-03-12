import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { NodeSDK } from "@opentelemetry/sdk-node";
import nconf from "nconf";

const traceExporter = new OTLPTraceExporter({
  url: `${nconf.get("OTEL_EXPORTER_OTLP_ENDPOINT")}:4317`,
});

export const sdk = new NodeSDK({
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-dns": { enabled: false },
      "@opentelemetry/instrumentation-fs": { enabled: false },
      "@opentelemetry/instrumentation-http": {
        ignoreIncomingRequestHook: (req) =>
          req.url === "/healthz" || req.url === "/readyz",
      },
      "@opentelemetry/instrumentation-net": { enabled: false },
    }),
  ],
  traceExporter,
});

sdk.start();

console.log("otel started");
