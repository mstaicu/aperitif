import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { NodeSDK } from "@opentelemetry/sdk-node";

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
});

sdk.start();

console.log("otel started");
