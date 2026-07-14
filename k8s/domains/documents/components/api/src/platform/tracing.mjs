import { FastifyOtelInstrumentation } from "@fastify/otel";
import { NodeSDK } from "@opentelemetry/sdk-node";

export const createTracing = () => {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    return {
      fastifyOtel: undefined,
      start: () => {},
      async [Symbol.asyncDispose]() {},
    };
  }

  const fastifyOtel = new FastifyOtelInstrumentation({
    ignorePaths: ({ url }) => url === "/healthz" || url === "/readyz",
  });

  const otel = new NodeSDK({
    instrumentations: [fastifyOtel],
    serviceName: process.env.OTEL_SERVICE_NAME,
  });

  return {
    fastifyOtel,
    start: () => otel.start(),
    [Symbol.asyncDispose]: () => otel.shutdown(),
  };
};
