import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

const sdk = new NodeSDK({
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-dns": { enabled: false },
      "@opentelemetry/instrumentation-fs": { enabled: false },
      "@opentelemetry/instrumentation-http": {
        ignoreIncomingRequestHook: (req) =>
          req.url === "/healthz" || req.url === "/readyz",
      },
      "@opentelemetry/instrumentation-net": { enabled: false },
      "@opentelemetry/instrumentation-pg": { enabled: false },
    }),
  ],
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "auth-api",
  }),
});

sdk.start();

console.log("otel started");
