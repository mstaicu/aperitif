import {
  context,
  propagation,
  SpanKind,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";

import { projectAccountChangedV1 } from "./projections/account-changed-v1.mjs";

const tracer = trace.getTracer("accounts-projection");

/**
 * @param {{
 *   message: import("@nats-io/jetstream").JsMsg,
 *   pool: import("pg").Pool,
 * }} args
 */
export async function project({ message, pool }) {
  const parentContext = propagation.extract(context.active(), {
    traceparent: message.headers?.get("traceparent"),
    tracestate: message.headers?.get("tracestate"),
  });

  await tracer.startActiveSpan(
    `process ${message.subject}`,
    {
      attributes: {
        "messaging.destination.name": message.subject,
        "messaging.operation.name": "process",
        "messaging.operation.type": "process",
        "messaging.system": "nats",
      },
      kind: SpanKind.CONSUMER,
    },
    parentContext,
    async (span) => {
      try {
        await projectAccountChangedV1({ event: message.json(), pool });
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
