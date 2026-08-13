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
  name: "plans-outbox",
  servers: [/** @type {string} */ (process.env.NATS_URL)],
  timeout: 2_000,
});

const js = jetstream(nc);
const jsm = await js.jetstreamManager();

await jsm.streams.add({
  discard: DiscardPolicy.New, // Reject overflow; preserve retained history.
  max_age: Number(process.env.NATS_STREAM_MAX_AGE_NANOS), // 7-day replay window.
  max_bytes: Number(process.env.NATS_STREAM_MAX_BYTES), // Half the 800 MiB budget.
  name: "PLANS", // Stable Plans stream identity.
  num_replicas: Number(process.env.NATS_STREAM_REPLICAS), // One copy per NATS pod.
  retention: RetentionPolicy.Limits, // Expire by age; cap by bytes.
  storage: StorageType.File, // Persist each copy on its pod PVC.
  subjects: ["plans.>"], // Capture Plans-owned events only.
});

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
