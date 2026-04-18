import { FastifyOtelInstrumentation } from "@fastify/otel";
import { NodeSDK } from "@opentelemetry/sdk-node";

import { createApp } from "./app.mjs";
import { createContext } from "./context.mjs";
import { createRuntime } from "./runtime/index.mjs";

const fastifyOtel = new FastifyOtelInstrumentation({
  ignorePaths: ({ url }) => url === "/healthz" || url === "/readyz",
});

const otel = new NodeSDK({
  instrumentations: [fastifyOtel],
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

var shutdownInitiated = false;

// SIGUSR2 is for nodemon
["SIGINT", "SIGTERM", "SIGUSR2"].forEach((signal) =>
  process.once(signal, async () => {
    if (shutdownInitiated) return;

    shutdownInitiated = true;

    console.log("closing server...");

    try {
      await app.close(); // triggers onClose hooks

      console.log("shutdown complete");

      process.exit(0);
    } catch {
      process.exit(1);
    }
  }),
);

await app.listen({ port: 3000 });
