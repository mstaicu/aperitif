import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

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
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "auth-api",
  }),
});

sdk.start();

console.log("otel started");

var shutdownInitiated = false;

["SIGINT", "SIGTERM", "SIGUSR2"].forEach((signal) =>
  process.on(signal, async () => {
    if (shutdownInitiated) return;

    shutdownInitiated = true;

    try {
      await sdk.shutdown();
      console.log("otel closed");
    } catch {
      console.error("otel shutdown error");
    }
  }),
);
