import { FastifyOtelInstrumentation } from "@fastify/otel";
import { NodeSDK } from "@opentelemetry/sdk-node";

export const createOtelContext = () => {
  const fastifyOtel = new FastifyOtelInstrumentation({
    ignorePaths: ({ url }) => url === "/healthz" || url === "/readyz",
  });

  const otel = new NodeSDK({
    instrumentations: [fastifyOtel],
  });

  return {
    close: otel.shutdown,
    fastifyOtel,
    start: otel.start,
  };
};
