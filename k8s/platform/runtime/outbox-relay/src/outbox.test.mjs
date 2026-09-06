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
    jsm,
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
    "application/cloudevents+json",
  );
  assert.equal(queuedMessage.headers?.get("Nats-Msg-Id"), queued.id);
  assert.equal(
    queuedMessage.headers?.get("Nats-Expected-Last-Subject-Sequence"),
    "0",
  );
  assert.equal(queuedMessage.headers?.get("Nats-Expected-Stream"), "EVENTS");
  assert.deepEqual(
    JSON.parse(new TextDecoder().decode(notifiedMessage.data)),
    notified,
  );
  assert.equal(notifiedMessage.subject, "events.notified");
  assert.equal(
    notifiedMessage.headers?.get("Content-Type"),
    "application/cloudevents+json",
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

test("keeps an outbox entry when JetStream is unavailable", async () => {
  // Arrange
  await using postgres = await startPostgres();
  const { pool } = postgres;
  await using nats = await startNats({ jetstream: false });
  const { nc } = nats;
  const js = jetstream(nc);
  const jsm = await js.jetstreamManager(false);
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
    jsm,
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

test("rejects a delayed older snapshot after a newer snapshot is retained", async (t) => {
  // Arrange
  await using postgres = await startPostgres();
  const { pool } = postgres;
  await using nats = await startNats();
  const js = jetstream(nats.nc);
  const jsm = await js.jetstreamManager();
  const subject = "events.resource";
  const older = {
    data: { revision: 1 },
    id: randomUUID(),
    type: "test.snapshot",
  };
  const newer = {
    data: { revision: 2 },
    id: randomUUID(),
    type: "test.snapshot",
  };
  const publish = js.publish.bind(js);
  /** @type {(() => ReturnType<typeof js.publish>) | undefined} */
  let publishLate;

  await jsm.streams.add({ ...stream, max_msgs_per_subject: 1 });
  await pool.query(
    "INSERT INTO outbox_events (id, subject, event) VALUES ($1, $2, $3)",
    [older.id, subject, older],
  );

  t.mock.method(
    js,
    "publish",
    async (/** @type {Parameters<typeof js.publish>} */ ...args) => {
      // The caller times out, but the original bytes can still arrive later.
      publishLate = () => publish(...args);
      throw new Error("PUBACK_TIMEOUT");
    },
    { times: 1 },
  );

  // Act
  await assert.rejects(
    relayOutbox({ abortSignal: new AbortController().signal, js, jsm, pool }),
    /PUBACK_TIMEOUT/,
  );

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM outbox_events WHERE subject = $1", [
      subject,
    ]);
    await client.query(
      "INSERT INTO outbox_events (id, subject, event) VALUES ($1, $2, $3)",
      [newer.id, subject, newer],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const abortController = new AbortController();
  const task = relayOutbox({
    abortSignal: abortController.signal,
    js,
    jsm,
    pool,
  });
  try {
    await t.waitFor(
      async () => {
        const { rowCount } = await pool.query("SELECT id FROM outbox_events");
        assert.equal(rowCount, 0);
      },
      { timeout: 5_000 },
    );
  } finally {
    abortController.abort();
    await task;
  }

  // Assert
  assert.ok(publishLate);
  await assert.rejects(publishLate(), /wrong last sequence/);
  const retained = await jsm.streams.getMessage("EVENTS", {
    last_by_subj: subject,
  });
  assert.ok(retained);
  assert.deepEqual(retained.json(), newer);
});

test("does not publish after losing the outbox database session", async (t) => {
  // Arrange
  await using postgres = await startPostgres();
  const { pool } = postgres;
  await using nats = await startNats();
  const js = jetstream(nats.nc);
  const jsm = await js.jetstreamManager();
  const subject = "events.resource";
  const older = {
    data: { revision: 1 },
    id: randomUUID(),
    type: "test.snapshot",
  };
  const newer = {
    data: { revision: 2 },
    id: randomUUID(),
    type: "test.snapshot",
  };
  const getMessage = jsm.streams.getMessage.bind(jsm.streams);
  const client = await pool.connect();
  const {
    rows: [{ pid }],
  } = await client.query("SELECT pg_backend_pid() AS pid");

  // Let this test observe the query failure instead of exiting the process.
  client.on("error", () => {});
  client.release();

  await jsm.streams.add({ ...stream, max_msgs_per_subject: 1 });
  await pool.query(
    "INSERT INTO outbox_events (id, subject, event) VALUES ($1, $2, $3)",
    [older.id, subject, older],
  );
  t.mock.method(
    jsm.streams,
    "getMessage",
    async (/** @type {Parameters<typeof getMessage>} */ ...args) => {
      await pool.query("SELECT pg_terminate_backend($1)", [pid]);
      await pool.query("DELETE FROM outbox_events WHERE id = $1", [older.id]);
      await js.publish(subject, JSON.stringify(newer), {
        expect: { lastSubjectSequence: 0 },
        msgID: newer.id,
      });
      return getMessage(...args);
    },
    { times: 1 },
  );

  // Act
  const task = relayOutbox({
    abortSignal: new AbortController().signal,
    js,
    jsm,
    pool,
  });

  // Assert
  await assert.rejects(task, /connection|queryable|terminat/i);
  const retained = await jsm.streams.getMessage("EVENTS", {
    last_by_subj: subject,
  });
  assert.ok(retained);
  assert.deepEqual(retained.json(), newer);
});
