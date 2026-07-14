import { AckPolicy, jetstream } from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";
import process from "node:process";
import { Pool } from "pg";

import { createHealthServer } from "./platform/health.mjs";
import { projections } from "./projections/index.mjs";

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

db.on("error", (err) => console.error(err));

await using nc = await connect({
  name: "entitlements-accounts-projector",
  servers: [/** @type {string} */ (process.env.NATS_URL)],
  timeout: 2_000,
});
const js = jetstream(nc);
const jsm = await js.jetstreamManager();
const info = await jsm.consumers.add("ACCOUNTS", {
  ack_policy: AckPolicy.Explicit,
  // A durable name preserves this consumer and its acknowledgement state
  // across worker restarts; without it, the consumer is ephemeral.
  durable_name: "entitlements-accounts-projection",
  // Omitting deliver_subject makes this a pull consumer; setting it would
  // make NATS push messages to that subject.
  filter_subjects: Object.keys(projections),
});
const consumer = js.consumers.getConsumerFromInfo(info);

await using health = createHealthServer({ db, nc });

health.listen(3000, "0.0.0.0");

const messages = await consumer.consume({ max_messages: 1 });

for (const signal of ["SIGINT", "SIGTERM", "SIGUSR2"]) {
  process.once(signal, () => messages.stop());
}

try {
  for await (const message of messages) {
    await projections[message.subject]({ db, event: message.json() });

    message.ack();
  }
} finally {
  messages.stop();
}

await db.end();
