import { AckPolicy, jetstream } from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";
import {
  context,
  propagation,
  SpanKind,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";
import process from "node:process";
import { Pool } from "pg";

import { createProbeServer } from "./platform/probes.mjs";
import { projections } from "./projections/index.mjs";

const tracer = trace.getTracer("accounts-projection");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => console.error(err));

await using nc = await connect({
  name: "plans-accounts-projection",
  servers: [/** @type {string} */ (process.env.NATS_URL)],
  timeout: 2_000,
});
const js = jetstream(nc);
const jsm = await js.jetstreamManager();
const info = await jsm.consumers.add("ACCOUNTS", {
  ack_policy: AckPolicy.Explicit,
  // A durable name preserves this consumer and its acknowledgement state
  // across worker restarts; without it, the consumer is ephemeral.
  durable_name: "plans-accounts-projection",
  // Omitting deliver_subject makes this a pull consumer; setting it would
  // make NATS push messages to that subject.
  filter_subjects: Object.keys(projections),
});
const consumer = js.consumers.getConsumerFromInfo(info);
const messages = await consumer.consume({ max_messages: 1 });

await using probeServer = createProbeServer({ nc, pool });

probeServer.listen(3000, "0.0.0.0");

for (const signal of ["SIGINT", "SIGTERM", "SIGUSR2"]) {
  process.once(signal, () => messages.stop());
}

try {
  for await (const message of messages) {
    const parentContext = propagation.extract(context.active(), {
      traceparent: message.headers?.get("traceparent"),
      tracestate: message.headers?.get("tracestate"),
    });

    await tracer.startActiveSpan(
      `${message.subject} process`,
      {
        attributes: {
          "messaging.consumer.group.name": "plans-accounts-projection",
          "messaging.destination.name": message.subject,
          "messaging.operation.type": "process",
          "messaging.system": "nats",
        },
        kind: SpanKind.CONSUMER,
      },
      parentContext,
      async (span) => {
        try {
          await projections[message.subject]({ event: message.json(), pool });

          message.ack();
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
} finally {
  messages.stop();
}

await pool.end();
