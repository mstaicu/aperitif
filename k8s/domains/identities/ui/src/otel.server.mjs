import { NodeSDK } from "@opentelemetry/sdk-node";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";

const otel = new NodeSDK({
  instrumentations: [new HttpInstrumentation(), new UndiciInstrumentation()],
});

otel.start();
