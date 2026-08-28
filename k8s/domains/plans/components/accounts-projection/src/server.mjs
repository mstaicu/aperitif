import { AccountV1SubjectPrefix } from "@mstaicu/accounts-contracts";
import { AckPolicy, DeliverPolicy, jetstream } from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";
import process from "node:process";
import { Pool } from "pg";

import { createProbeServer } from "./platform/probes.mjs";
import { project } from "./project.mjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => console.error(err));

await using nc = await connect({
  maxReconnectAttempts: -1, // An established worker waits through any broker outage.
  name: "plans-accounts-projection",
  servers: [/** @type {string} */ (process.env.NATS_URL)],
  timeout: 2_000,
});
const js = jetstream(nc);
const jsm = await js.jetstreamManager();
const info = await jsm.consumers.add("ACCOUNTS", {
  ack_policy: AckPolicy.Explicit, // Advance only after projection succeeds.
  deliver_policy: DeliverPolicy.LastPerSubject,
  filter_subject: `${AccountV1SubjectPrefix}.*`,
});
const consumer = js.consumers.getConsumerFromInfo(info);
const messages = await consumer.consume({
  max_messages: 1, // Process one message at a time.
});

await using probeServer = createProbeServer({ nc, pool });

probeServer.listen(3000, "0.0.0.0");

for (const signal of ["SIGINT", "SIGTERM", "SIGUSR2"]) {
  process.once(signal, () => messages.stop());
}

try {
  for await (const message of messages) {
    await project({ message, pool });
    message.ack();
  }
} finally {
  messages.stop();
  await pool.end();
}
