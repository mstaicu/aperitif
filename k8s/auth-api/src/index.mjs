import nconf from "nconf";

nconf
  .env()
  .required([
    "DATABASE_URL",

    "JWT_PRIVATE_KEY_PATH",
    "JWT_PUBLIC_KEY_PATH",

    "NATS_URL",
    "NATS_USER",
    "NATS_PASSWORD",

    "ORIGIN",
    "OTEL_EXPORTER_OTLP_ENDPOINT",
  ]);

var origin = nconf.get("ORIGIN");

try {
  new URL(origin);
} catch {
  throw new Error(`Invalid ORIGIN: ${origin}`);
}

import("./otel.mjs");
import("./server.mjs");
