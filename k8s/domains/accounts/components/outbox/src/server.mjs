import {
  DiscardPolicy,
  jetstream,
  RetentionPolicy,
  StorageType,
} from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";
import process from "node:process";
import { Pool } from "pg";

import { createProbeServer } from "./platform/probes.mjs";
import { publishEvents } from "./publish.mjs";

const controller = new AbortController();

for (const signal of ["SIGINT", "SIGTERM", "SIGUSR2"]) {
  process.once(signal, () => controller.abort());
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => console.error(err));

await using nc = await connect({
  name: "accounts-outbox",
  servers: [/** @type {string} */ (process.env.NATS_URL)],
  timeout: 2_000,
});

const js = jetstream(nc);
const jsm = await js.jetstreamManager();

await jsm.streams.add({
  discard: DiscardPolicy.New,
  max_bytes: Number(process.env.NATS_STREAM_MAX_BYTES),
  name: "ACCOUNTS",
  num_replicas: Number(process.env.NATS_STREAM_REPLICAS),
  retention: RetentionPolicy.Limits,
  storage: StorageType.File,
  subjects: ["accounts.>"],
});

await using probeServer = createProbeServer({ nc, pool });

probeServer.listen(3000, "0.0.0.0");

await publishEvents({
  js,
  pool,
  signal: controller.signal,
});

await pool.end();
