import nconf from "nconf";

nconf
  .env()
  .required([
    "DATABASE_URL",

    "JWT_PRIVATE_KEY_PATH",
    "JWT_PUBLIC_KEY_PATH",
    "JWT_ALLOWED_AUDIENCES",

    "NATS_URL",

    "ORIGIN",
  ]);

const origin = nconf.get("ORIGIN");

try {
  new URL(origin);
} catch {
  throw new Error(`Invalid ORIGIN: ${origin}`);
}

await import("./server.mjs");
