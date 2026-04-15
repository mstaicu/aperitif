import { FastifyOtelInstrumentation } from "@fastify/otel";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { NodeSDK } from "@opentelemetry/sdk-node";

import { createApp } from "./app.mjs";
import { createContext } from "./context.mjs";
import { createRuntime } from "./runtime/index.mjs";

const fastifyOtel = new FastifyOtelInstrumentation({
  ignorePaths: ({ url }) => url === "/healthz" || url === "/readyz",
});

const otel = new NodeSDK({
  instrumentations: [
    new HttpInstrumentation({
      ignoreIncomingRequestHook: (req) =>
        req.url === "/healthz" || req.url === "/readyz",
    }),
    fastifyOtel,
  ],
});

otel.start();

const ctx = await createContext();
const runtime = createRuntime(ctx);

const app = await createApp({
  ctx,
  fastifyOtel,
  runtime,
});

app.addHook("onClose", () => otel.shutdown());
app.addHook("onClose", () => ctx.lifecycle.close());

await app.ready();
await app.listen({ port: 3000 });
