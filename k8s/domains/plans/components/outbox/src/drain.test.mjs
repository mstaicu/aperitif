import {
  AccountFeaturesV1SubjectPrefix,
  buildAccountFeaturesV1Subject,
} from "@mstaicu/plans-contracts";
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
    type: "plans.account-features.changed.v1",
  };
  const subject = buildAccountFeaturesV1Subject(randomUUID());
  const js = jetstream(nats.nc);
  const jsm = await js.jetstreamManager();

  await jsm.streams.add({
    discard: DiscardPolicy.New,
    discard_new_per_subject: false,
    max_age: 0,
    max_bytes: 419_430_400,
    max_msgs_per_subject: 1,
    name: "PLANS",
    num_replicas: 1,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    subjects: [`${AccountFeaturesV1SubjectPrefix}.>`],
  });

  await pool.query(
    `
      INSERT INTO outbox_events (id, subject, event)
      VALUES ($1, $2, $3::jsonb)
    `,
    [event.id, subject, JSON.stringify(event)],
  );

  const subscription = nats.nc.subscribe(subject, {
    max: 1,
    timeout: 5000,
  });
  const task = drain({ js, pool, signal: controller.signal });
  const { value: message } = await subscription[Symbol.asyncIterator]().next();

  controller.abort();
  await task;

  assert.ok(message);
  assert.deepEqual(JSON.parse(new TextDecoder().decode(message.data)), event);
  assert.equal(message.subject, subject);
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
    type: "plans.account-features.changed.v1",
  };
  const subject = buildAccountFeaturesV1Subject(randomUUID());

  await pool.query(
    `
      INSERT INTO outbox_events (id, subject, event)
      VALUES ($1, $2, $3::jsonb)
    `,
    [event.id, subject, JSON.stringify(event)],
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
