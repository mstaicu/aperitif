import { FastifyOtelInstrumentation } from "@fastify/otel";
import { NodeSDK } from "@opentelemetry/sdk-node";
import nconf from "nconf";

export const createOtelContext = () => {
  if (!nconf.get("OTEL_EXPORTER_OTLP_ENDPOINT")) {
    return {
      close: async () => {},
      fastifyOtel: undefined,
      start: () => {},
    };
  }

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
