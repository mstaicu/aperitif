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

const streamMaxBytes = Number(process.env.NATS_STREAM_MAX_BYTES);

if (!Number.isSafeInteger(streamMaxBytes) || streamMaxBytes <= 0) {
  throw new Error("NATS_STREAM_MAX_BYTES must be a positive integer");
}

await import("./worker.mjs");
