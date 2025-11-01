import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { NodeSDK } from "@opentelemetry/sdk-node";

var traceExporter = new OTLPTraceExporter({
  url: "http://signoz-otel-collector.signoz:4318/v1/traces",
});

var sdk = new NodeSDK({
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-dns": { enabled: false },
      "@opentelemetry/instrumentation-http": {
        ignoreIncomingRequestHook: (req) =>
          req.url.startsWith("/healthz") || req.url.startsWith("/readyz"),
      },
      "@opentelemetry/instrumentation-net": { enabled: false },
    }),
  ],
  serviceName: "auth-api",
  traceExporter,
});

sdk.start();

export { sdk };
