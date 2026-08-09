import { headers } from "@nats-io/transport-node";
import {
  context,
  propagation,
  SpanKind,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";

const tracer = trace.getTracer("outbox");

/**
 * @param {{
 *   event: { type: string },
 *   id: string,
 *   js: import("@nats-io/jetstream").JetStreamClient,
 *   traceparent?: string,
 *   tracestate?: string,
 * }} args
 */
export async function publish({ event, id, js, traceparent, tracestate }) {
  const parentContext = propagation.extract(context.active(), {
    traceparent,
    tracestate,
  });

  await tracer.startActiveSpan(
    `publish ${event.type}`,
    {
      attributes: {
        "messaging.destination.name": event.type,
        "messaging.message.id": id,
        "messaging.operation.name": "publish",
        "messaging.operation.type": "send",
        "messaging.system": "nats",
      },
      kind: SpanKind.PRODUCER,
    },
    parentContext,
    async (span) => {
      try {
        const messageHeaders = headers();

        propagation.inject(context.active(), messageHeaders, {
          set: (carrier, key, value) => carrier.set(key, value),
        });

        await js.publish(event.type, JSON.stringify(event), {
          headers: messageHeaders,
          msgID: id,
        });
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR });

        if (Error.isError(err)) {
          span.recordException(err);
        }

        throw err;
      } finally {
        span.end();
      }
    },
  );
}
