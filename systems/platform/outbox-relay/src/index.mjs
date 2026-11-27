for (const envVar of ["DATABASE_URL", "NATS_STREAMS_PATH", "NATS_URL"]) {
  if (!process.env[envVar]) {
    throw new Error(`${envVar} is required`);
  }
}

let otel;

if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  const serviceName = process.env.OTEL_SERVICE_NAME;
  if (!serviceName) throw new Error("OTEL_SERVICE_NAME is required");

  const { NodeSDK } = await import("@opentelemetry/sdk-node");
  otel = new NodeSDK({ serviceName });
  otel.start();
}

try {
  await import("./server.mjs");
} finally {
  await otel?.shutdown();
}
