import { AccountV1SubjectPrefix } from "@mstaicu/accounts-contracts";
import {
  DiscardPolicy,
  jetstream,
  RetentionPolicy,
  StorageType,
} from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";
import process from "node:process";
import { Pool } from "pg";

import { drain } from "./drain.mjs";
import { createProbeServer } from "./platform/probes.mjs";

const controller = new AbortController();

for (const signal of ["SIGINT", "SIGTERM", "SIGUSR2"]) {
  process.once(signal, () => controller.abort());
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => console.error(err));

await using nc = await connect({
  maxReconnectAttempts: -1, // An established worker waits through any broker outage.
  name: "accounts-outbox",
  servers: [/** @type {string} */ (process.env.NATS_URL)],
  timeout: 2_000,
});

const js = jetstream(nc);
const jsm = await js.jetstreamManager();

const accountsStream = {
  // Keep one current Account per subject. At byte capacity, existing Accounts
  // still update; a new Account stays in the outbox instead of evicting one.
  discard: DiscardPolicy.New,
  discard_new_per_subject: false,
  max_age: 0,
  max_bytes: Number(process.env.NATS_STREAM_MAX_BYTES),
  max_msgs_per_subject: 1,
  name: "ACCOUNTS",
  num_replicas: Number(process.env.NATS_STREAM_REPLICAS),
  retention: RetentionPolicy.Limits,
  storage: StorageType.File,
  subjects: [`${AccountV1SubjectPrefix}.>`],
};

try {
  await jsm.streams.update(accountsStream.name, accountsStream);
} catch (err) {
  if (!(err instanceof Error) || err.name !== "StreamNotFoundError") {
    throw err;
  }

  await jsm.streams.add(accountsStream);
}

await using probeServer = createProbeServer({ nc, pool });

probeServer.listen(3000, "0.0.0.0");

try {
  await drain({
    js,
    pool,
    signal: controller.signal,
  });
} finally {
  await pool.end();
}
