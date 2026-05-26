import { once } from "node:events";
import process from "node:process";

import { createApp } from "./app.mjs";
import { createContext } from "./platform/context.mjs";
import { createOtelContext } from "./platform/observability/otel.mjs";
import { createTenantRolesService } from "./services/tenant-roles/index.mjs";
import { createTenancyService } from "./services/tenants/index.mjs";

const otel = createOtelContext();

otel.start();

const ctx = await createContext();

const app = await createApp({
  ctx,
  fastifyOtel: otel.fastifyOtel,
  services: {
    tenancy: createTenancyService(ctx),
    tenantRoles: createTenantRolesService(ctx),
  },
});

app.addHook("onClose", () => otel.close());
app.addHook("onClose", () => ctx.lifecycle.close());

await app.listen({ host: "0.0.0.0", port: 3000 });

const [signal] = await Promise.race(
  ["SIGINT", "SIGTERM", "SIGUSR2"].map((code) => once(process, code)),
);

app.log.info({ signal }, "closing server");

await app.close();

app.log.info("shutdown complete");
