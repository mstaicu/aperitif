import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";

import { app } from "./app.mjs";

await app.ready();

await app.listen({
  host: "0.0.0.0",
  port: 3000,
});

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
