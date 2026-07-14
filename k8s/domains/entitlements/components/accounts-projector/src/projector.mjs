import { addAbortListener } from "node:events";

import { getConsumer } from "./platform/nats.mjs";

/**
 * @param {{
 *   db: import("pg").Pool,
 *   nc: import("@nats-io/transport-node").NatsConnection,
 *   projections: Record<string, (args: {
 *     db: import("pg").Pool,
 *     event: unknown,
 *   }) => Promise<void>>,
 *   signal: AbortSignal,
 * }} args
 */
export async function project({ db, nc, projections, signal }) {
  try {
    signal.throwIfAborted();

    const consumer = await getConsumer({
      nc,
      signal,
      subjects: Object.keys(projections),
    });
    const messages = await consumer.consume({ max_messages: 1 });

    try {
      // eslint-disable-next-line
      using stopOnAbort = addAbortListener(signal, () => messages.stop());

      for await (const message of messages) {
        signal.throwIfAborted();

        try {
          const event = message.json();

          if (
            !event ||
            typeof event !== "object" ||
            !("type" in event) ||
            event.type !== message.subject
          ) {
            console.warn(
              JSON.stringify({
                event: "invalid_event_ignored",
                level: "warn",
                subject: message.subject,
              }),
            );
            message.ack();
            continue;
          }

          const projection = projections[message.subject];

          if (!projection) {
            message.ack();
            continue;
          }

          await projection({ db, event });

          message.ack();
        } catch (err) {
          console.error(
            JSON.stringify({
              error: err instanceof Error ? err.message : String(err),
              event: "projection_failed",
              level: "error",
              subject: message.subject,
            }),
          );
          message.nak();
          throw err;
        }
      }
    } finally {
      messages.stop();
    }
  } catch (err) {
    if (Error.isError(err) && err.name === "AbortError") {
      return;
    }

    throw err;
  }
}
