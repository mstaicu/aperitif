import { headers } from "@nats-io/transport-node";
import {
  context,
  propagation,
  SpanKind,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";
import { setTimeout } from "node:timers/promises";

/**
 * @param {{
 *   jsm: import("@nats-io/jetstream").JetStreamManager,
 *   pool: import("pg").Pool,
 *   signal: AbortSignal,
 * }} options
 */
export async function runOutboxRelay({ jsm, pool, signal }) {
  const publisher = jsm.jetstream();
  const tracer = trace.getTracer("outbox-relay");

  const client = await pool.connect();
  client.on("error", (error) => console.error(error));

  try {
    while (!signal.aborted) {
      await client.query("BEGIN");

      const {
        rows: [message],
      } = await client.query(`
        SELECT id, subject, payload::text, headers
        FROM outbox_messages
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `);

      if (!message) {
        await client.query("COMMIT");
        await setTimeout(1_000);
        continue;
      }

      try {
        await publishMessage(message);
        await client.query("DELETE FROM outbox_messages WHERE id = $1", [
          message.id,
        ]);
        await client.query("COMMIT");
      } catch (cause) {
        throw new Error(
          `Failed to deliver outbox row ${message.id} on ${message.subject}`,
          { cause },
        );
      }
    }
  } finally {
    // Closing the session rolls back any open transaction and releases its row lock.
    client.release(true);
  }

  /** @param {{ id: string, subject: string, payload: string, headers: Record<string, string> }} message */
  async function publishMessage({
    headers: outboxHeaders,
    id,
    payload,
    subject,
  }) {
    const parentContext = propagation.extract(context.active(), outboxHeaders);
    const span = tracer.startSpan(
      "publish",
      {
        attributes: {
          "messaging.destination.name": subject,
          "messaging.message.id": id,
          "messaging.operation.name": "publish",
          "messaging.operation.type": "send",
          "messaging.system": "nats",
        },
        kind: SpanKind.PRODUCER,
      },
      parentContext,
    );

    try {
      const natsHeaders = headers();
      propagation.inject(trace.setSpan(parentContext, span), outboxHeaders);

      for (const [name, value] of Object.entries(outboxHeaders)) {
        if (name.toLowerCase().startsWith("nats-")) {
          throw new Error(`Reserved NATS header: ${name}`);
        }
        natsHeaders.set(name, value);
      }

      let expectedStreamState;
      if (subject.split(".", 2)[1] === "state") {
        const streamName = await jsm.streams.find(subject);
        const lastMessage = await jsm.streams.getMessage(streamName, {
          last_by_subj: subject,
        });

        // Confirm the transaction connection is still alive after the stream read.
        await client.query("SELECT 1");
        expectedStreamState = {
          lastSubjectSequence: lastMessage?.seq ?? 0,
          streamName,
        };
      }

      await publisher.publish(subject, payload, {
        expect: expectedStreamState,
        headers: natsHeaders,
        msgID: id,
      });
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      if (Error.isError(error)) span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }
}
