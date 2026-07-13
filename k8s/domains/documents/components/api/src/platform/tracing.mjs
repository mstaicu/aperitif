import { FastifyOtelInstrumentation } from "@fastify/otel";
import { NodeSDK } from "@opentelemetry/sdk-node";

export const createTracing = () => {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    return {
      close: async () => {},
      fastifyOtel: undefined,
      start: () => {},
    };
  }

  if (!process.env.OTEL_SERVICE_NAME) {
    throw new Error("OTEL_SERVICE_NAME is required");
  }

  const fastifyOtel = new FastifyOtelInstrumentation({
    ignorePaths: ({ url }) => url === "/healthz" || url === "/readyz",
  });

  const otel = new NodeSDK({
    instrumentations: [fastifyOtel],
    serviceName: process.env.OTEL_SERVICE_NAME,
  });

  return {
    close: () => otel.shutdown(),
    fastifyOtel,
    start: () => otel.start(),
  };
};
