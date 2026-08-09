import {
  DiscardPolicy,
  jetstream,
  RetentionPolicy,
  StorageType,
} from "@nats-io/jetstream";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { startNats } from "../test/fixtures/nats.mjs";
import { startPostgres } from "../test/fixtures/postgres.mjs";
import { drain } from "./drain.mjs";

test("publishes and removes an outbox event", async () => {
  await using postgres = await startPostgres();
  const { pool } = postgres;
  await using nats = await startNats();
  const controller = new AbortController();
  const event = {
    id: randomUUID(),
    type: "plans.test",
  };
  const js = jetstream(nats.nc);
  const jsm = await js.jetstreamManager();

  await jsm.streams.add({
    discard: DiscardPolicy.New,
    max_bytes: 419_430_400,
    name: "PLANS",
    num_replicas: 1,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    subjects: ["plans.>"],
  });

  await pool.query(
    `
      INSERT INTO outbox_events (id, event)
      VALUES ($1, $2::jsonb)
    `,
    [event.id, JSON.stringify(event)],
  );

  const subscription = nats.nc.subscribe(event.type, {
    max: 1,
    timeout: 5000,
  });
  const task = drain({ js, pool, signal: controller.signal });
  const { value: message } = await subscription[Symbol.asyncIterator]().next();

  controller.abort();
  await task;

  assert.ok(message);
  assert.deepEqual(JSON.parse(new TextDecoder().decode(message.data)), event);
  assert.equal(message.headers?.get("Nats-Msg-Id"), event.id);

  const {
    rows: [{ count }],
  } = await pool.query("SELECT count(*)::integer AS count FROM outbox_events");

  assert.equal(count, 0);
});

test("keeps an outbox event when publishing fails", async () => {
  await using postgres = await startPostgres();
  const { pool } = postgres;
  await using nats = await startNats();
  const event = {
    id: randomUUID(),
    type: "plans.test",
  };

  await pool.query(
    `
      INSERT INTO outbox_events (id, event)
      VALUES ($1, $2::jsonb)
    `,
    [event.id, JSON.stringify(event)],
  );

  await assert.rejects(
    drain({
      js: jetstream(nats.nc),
      pool,
      signal: new AbortController().signal,
    }),
  );

  const {
    rows: [outboxEvent],
  } = await pool.query("SELECT id FROM outbox_events WHERE id = $1", [
    event.id,
  ]);

  assert.equal(outboxEvent.id, event.id);
});
