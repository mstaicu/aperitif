import {
  DiscardPolicy,
  jetstream,
  RetentionPolicy,
  StorageType,
} from "@nats-io/jetstream";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { setTimeout } from "node:timers/promises";

import { startNats } from "../test/fixtures/nats.mjs";
import { startPostgres } from "../test/fixtures/postgres.mjs";
import { publishEvents } from "./publish.mjs";

test("publishes queued and newly inserted outbox events", async () => {
  // Arrange
  await using postgres = await startPostgres();
  const { pool } = postgres;
  await using nats = await startNats();
  const controller = new AbortController();
  const queuedEvent = {
    id: randomUUID(),
    type: "plans.test.queued",
  };
  const notifiedEvent = {
    id: randomUUID(),
    type: "plans.test.notified",
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

  const subscription = nats.nc.subscribe("plans.test.*", {
    max: 2,
    timeout: 5000,
  });

  await pool.query(
    `
      INSERT INTO outbox_events (id, event)
      VALUES ($1, $2::jsonb)
    `,
    [queuedEvent.id, JSON.stringify(queuedEvent)],
  );

  // Act
  const messages = subscription[Symbol.asyncIterator]();
  const task = publishEvents({
    js,
    pool,
    signal: controller.signal,
  });
  const { value: queuedMessage } = await messages.next();

  // Let the outbox process return to LISTEN after draining the queued event.
  await setTimeout(250);
  await pool.query(
    `
      INSERT INTO outbox_events (id, event)
      VALUES ($1, $2::jsonb)
    `,
    [notifiedEvent.id, JSON.stringify(notifiedEvent)],
  );

  const { value: notifiedMessage } = await messages.next();
  controller.abort();
  await task;

  // Assert
  for (const [message, event] of [
    [queuedMessage, queuedEvent],
    [notifiedMessage, notifiedEvent],
  ]) {
    assert.ok(message);
    assert.deepEqual(JSON.parse(new TextDecoder().decode(message.data)), event);
    assert.equal(message.headers?.get("Nats-Msg-Id"), event.id);
  }

  const {
    rows: [{ count }],
  } = await pool.query(
    `
      SELECT count(*)::integer AS count
      FROM outbox_events
      WHERE id = ANY($1::uuid[])
        AND published_at IS NOT NULL
    `,
    [[queuedEvent.id, notifiedEvent.id]],
  );

  assert.equal(count, 2);
});

test("keeps outbox events unpublished when NATS publish fails", async () => {
  // Arrange
  await using postgres = await startPostgres();
  const { pool } = postgres;
  await using nats = await startNats();
  const controller = new AbortController();
  const js = jetstream(nats.nc);
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

  // Act
  const publish = publishEvents({
    js,
    pool,
    signal: controller.signal,
  });

  // Assert
  await assert.rejects(publish);

  const {
    rows: [outbox],
  } = await pool.query(
    `
      SELECT published_at
      FROM outbox_events
      WHERE id = $1
    `,
    [event.id],
  );

  assert.equal(outbox.published_at, null);
});
