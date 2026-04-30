import { createApp } from "./app.mjs";
import { createTenancyDomain } from "./domains/tenancy/index.mjs";
import { createContext } from "./platform/context.mjs";
import { createOtelContext } from "./platform/observability/otel.mjs";

const otel = createOtelContext();

let shutdownInitiated = false;

/** @type {import("./platform/context.mjs").Context | undefined} */
let ctx;
/** @type {import("./app.mjs").FastifyInstance | undefined} */
let app;

const shutdown = async () => {
  if (shutdownInitiated) return;

  shutdownInitiated = true;

  if (app) {
    await app.close();
  } else if (ctx) {
    await Promise.allSettled([ctx.lifecycle.close(), otel.close()]);
  } else {
    await otel.close();
  }
};

try {
  otel.start();

  ctx = await createContext();

  const domains = {
    tenancy: createTenancyDomain(ctx),
  };
  const lifecycle = ctx.lifecycle;

  app = await createApp({
    ctx,
    domains,
    fastifyOtel: otel.fastifyOtel,
  });

  app.addHook("onClose", () => otel.close());
  app.addHook("onClose", () => lifecycle.close());

  // SIGUSR2 is for nodemon
  ["SIGINT", "SIGTERM", "SIGUSR2"].forEach((signal) =>
    process.once(signal, async () => {
      console.log("closing server...");

      try {
        await shutdown();

        console.log("shutdown complete");

        process.exit(0);
      } catch {
        process.exit(1);
      }
    }),
  );

  await app.listen({ host: "0.0.0.0", port: 3000 });
} catch (err) {
  await shutdown().catch(() => {});
  throw err;
}
