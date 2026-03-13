import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { NodeSDK } from "@opentelemetry/sdk-node";

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
});

sdk.start();

// process.once("SIGTERM", async () => {
//   await sdk.shutdown();
// });
// process.once("SIGINT", async () => {
//   await sdk.shutdown();
// });
