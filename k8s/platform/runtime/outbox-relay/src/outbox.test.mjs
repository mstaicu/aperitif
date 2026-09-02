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
import { relayOutbox } from "./outbox.mjs";

const stream = {
  discard: DiscardPolicy.New,
  max_bytes: 419_430_400,
  name: "EVENTS",
  num_replicas: 1,
  retention: RetentionPolicy.Limits,
  storage: StorageType.File,
  subjects: ["events.>"],
};

test("relays queued entries", async () => {
  // Arrange
  await using postgres = await startPostgres();
  const { pool } = postgres;
  await using nats = await startNats();
  const { nc } = nats;
  const abortController = new AbortController();
  const js = jetstream(nc);
  const jsm = await js.jetstreamManager();
  const queued = {
    id: randomUUID(),
    type: "test.queued",
  };
  const notified = {
    id: randomUUID(),
    type: "test.notified",
  };

  await jsm.streams.add(stream);

  const subscription = nc.subscribe("events.>", {
    max: 2,
    timeout: 5_000,
  });
  const messages = subscription[Symbol.asyncIterator]();

  await pool.query(
    `
      INSERT INTO outbox_events (id, subject, event)
      VALUES ($1, 'events.queued', $2::jsonb)
    `,
    [queued.id, JSON.stringify(queued)],
  );

  // Act
  const task = relayOutbox({
    abortSignal: abortController.signal,
    js,
    pool,
  });
  const { value: queuedMessage } = await messages.next();

  await pool.query(
    `
      INSERT INTO outbox_events (id, subject, event)
      VALUES ($1, 'events.notified', $2::jsonb)
    `,
    [notified.id, JSON.stringify(notified)],
  );

  const { value: notifiedMessage } = await messages.next();

  abortController.abort();
  await task;

  // Assert
  assert.ok(queuedMessage);
  assert.ok(notifiedMessage);
  assert.deepEqual(
    JSON.parse(new TextDecoder().decode(queuedMessage.data)),
    queued,
  );
  assert.equal(queuedMessage.subject, "events.queued");
  assert.equal(
    queuedMessage.headers?.get("Content-Type"),
    "application/cloudevents",
  );
  assert.equal(queuedMessage.headers?.get("Nats-Msg-Id"), queued.id);
  assert.deepEqual(
    JSON.parse(new TextDecoder().decode(notifiedMessage.data)),
    notified,
  );
  assert.equal(notifiedMessage.subject, "events.notified");
  assert.equal(
    notifiedMessage.headers?.get("Content-Type"),
    "application/cloudevents",
  );
  assert.equal(notifiedMessage.headers?.get("Nats-Msg-Id"), notified.id);

  const {
    rows: [{ count }],
  } = await pool.query(
    `
      SELECT count(*)::integer AS count
      FROM outbox_events
    `,
  );

  assert.equal(count, 0);
});

test("keeps an outbox entry when PubAck fails", async () => {
  // Arrange
  await using postgres = await startPostgres();
  const { pool } = postgres;
  await using nats = await startNats({ jetstream: false });
  const { nc } = nats;
  const js = jetstream(nc);
  const event = {
    id: randomUUID(),
    type: "test.timeout",
  };
  await pool.query(
    `
      INSERT INTO outbox_events (id, subject, event)
      VALUES ($1, 'events.timeout', $2::jsonb)
    `,
    [event.id, JSON.stringify(event)],
  );

  // Act
  const relay = relayOutbox({
    abortSignal: new AbortController().signal,
    js,
    pool,
  });

  // Assert
  await assert.rejects(relay, /JetStreamNotEnabled/);

  const {
    rows: [outboxEntry],
  } = await pool.query(
    `
      SELECT id
      FROM outbox_events
      WHERE id = $1
    `,
    [event.id],
  );

  assert.equal(outboxEntry.id, event.id);
});
