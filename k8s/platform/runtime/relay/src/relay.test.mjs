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
import { drain } from "./relay.mjs";

const stream = {
  discard: DiscardPolicy.New,
  max_bytes: 419_430_400,
  name: "EVENTS",
  num_replicas: 1,
  retention: RetentionPolicy.Limits,
  storage: StorageType.File,
  subjects: ["events.>"],
};

test("publishes pending rows and later rows", async () => {
  await using postgres = await startPostgres();
  const { pool } = postgres;
  await using nats = await startNats();
  const controller = new AbortController();
  const js = jetstream(nats.nc);
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

  const subscription = nats.nc.subscribe("events.>", {
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

  const task = drain({
    js,
    pool,
    signal: controller.signal,
  });
  const { value: queuedMessage } = await messages.next();

  await setTimeout(50);
  await pool.query(
    `
      INSERT INTO outbox_events (id, subject, event)
      VALUES ($1, 'events.notified', $2::jsonb)
    `,
    [notified.id, JSON.stringify(notified)],
  );

  const { value: notifiedMessage } = await messages.next();

  controller.abort();
  await task;

  for (const [message, event, subject] of [
    [queuedMessage, queued, "events.queued"],
    [notifiedMessage, notified, "events.notified"],
  ]) {
    assert.ok(message);
    assert.deepEqual(JSON.parse(new TextDecoder().decode(message.data)), event);
    assert.equal(
      message.headers?.get("Content-Type"),
      "application/cloudevents",
    );
    assert.equal(message.headers?.get("Nats-Msg-Id"), event.id);
    assert.equal(message.subject, subject);
  }

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

test("keeps a row when bounded JetStream publication fails", async () => {
  await using postgres = await startPostgres();
  const { pool } = postgres;
  const event = {
    id: randomUUID(),
    type: "test.timeout",
  };
  const controller = new AbortController();

  await pool.query(
    `
      INSERT INTO outbox_events (id, subject, event)
      VALUES ($1, 'events.timeout', $2::jsonb)
    `,
    [event.id, JSON.stringify(event)],
  );

  await assert.rejects(
    drain({
      js: /** @type {import("@nats-io/jetstream").JetStreamClient} */ (
        /** @type {unknown} */ ({
          publish: async (
            /** @type {string} */ _subject,
            /** @type {unknown} */ _data,
            /** @type {{ timeout?: number } | undefined} */ options,
          ) => {
            assert.equal(options?.timeout, 5_000);
            throw new Error("PUBACK_TIMEOUT");
          },
        })
      ),
      pool,
      signal: controller.signal,
    }),
    /PUBACK_TIMEOUT/,
  );

  const {
    rows: [outboxEvent],
  } = await pool.query(
    `
      SELECT id
      FROM outbox_events
      WHERE id = $1
    `,
    [event.id],
  );

  assert.equal(outboxEvent.id, event.id);
});

test("two Relay instances drain separate locked rows", async () => {
  await using postgres = await startPostgres();
  const { pool } = postgres;
  await using nats = await startNats();
  const firstController = new AbortController();
  const secondController = new AbortController();
  const js = jetstream(nats.nc);
  const jsm = await js.jetstreamManager();
  const first = {
    id: randomUUID(),
    type: "test.first",
  };
  const second = {
    id: randomUUID(),
    type: "test.second",
  };
  let publishCount = 0;
  let release = () => {};
  const bothPublishing = new Promise((resolve) => {
    release = () => resolve(undefined);
  });

  await jsm.streams.add(stream);
  await pool.query(
    `
      INSERT INTO outbox_events (id, subject, event, queued_at)
      VALUES
        ($1, 'events.first', $2::jsonb, '2026-01-01T00:00:00Z'),
        ($3, 'events.second', $4::jsonb, '2026-01-01T00:00:01Z')
    `,
    [first.id, JSON.stringify(first), second.id, JSON.stringify(second)],
  );

  const subscription = nats.nc.subscribe("events.>", {
    max: 2,
    timeout: 5_000,
  });
  const messages = subscription[Symbol.asyncIterator]();
  const concurrentJs =
    /** @type {import("@nats-io/jetstream").JetStreamClient} */ ({
      publish: async (...args) => {
        publishCount += 1;

        if (publishCount === 2) {
          release();
        }

        await bothPublishing;
        return js.publish(...args);
      },
    });

  const firstTask = drain({
    js: concurrentJs,
    pool,
    signal: firstController.signal,
  });
  const secondTask = drain({
    js: concurrentJs,
    pool,
    signal: secondController.signal,
  });

  const { value: firstMessage } = await messages.next();
  const { value: secondMessage } = await messages.next();

  firstController.abort();
  secondController.abort();
  await Promise.all([firstTask, secondTask]);

  assert.ok(firstMessage);
  assert.ok(secondMessage);
  assert.deepEqual(
    new Set(
      [firstMessage, secondMessage].map(
        (message) => JSON.parse(new TextDecoder().decode(message.data)).id,
      ),
    ),
    new Set([first.id, second.id]),
  );

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
