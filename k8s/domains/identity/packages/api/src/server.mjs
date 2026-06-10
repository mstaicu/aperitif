import { once } from "node:events";
import process from "node:process";

import { createApp } from "./app.mjs";
import { createRuntime } from "./platform/runtime.mjs";
import { createTracing } from "./platform/tracing.mjs";
import { createOperatorsService } from "./services/operators/index.mjs";
import { createPasskeysService } from "./services/passkeys/index.mjs";
import { createSessionsService } from "./services/sessions/index.mjs";

const tracing = createTracing();

tracing.start();

const runtime = await createRuntime();

const app = await createApp({
  fastifyOtel: tracing.fastifyOtel,
  runtime,
  services: {
    operators: createOperatorsService(runtime),
    passkeys: createPasskeysService(runtime),
    sessions: createSessionsService(runtime),
  },
});

app.addHook("onClose", () => tracing.close());
app.addHook("onClose", () => runtime.lifecycle.close());

await app.listen({ host: "0.0.0.0", port: 3000 });

const [signal] = await Promise.race(
  ["SIGINT", "SIGTERM", "SIGUSR2"].map((code) => once(process, code)),
);

app.log.info({ signal }, "closing server");

await app.close();

app.log.info("shutdown complete");
