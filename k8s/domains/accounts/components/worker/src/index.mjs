const requiredEnv = [
  "DATABASE_URL",
  "NATS_STREAM_MAX_BYTES",
  "NATS_STREAM_REPLICAS",
  "NATS_URL",
];

for (const name of requiredEnv) {
  if (!process.env[name]) {
    throw new Error(`${name} is required`);
  }
}

await import("./worker.mjs");
