import { jetstream } from "@nats-io/jetstream";
import { context, propagation, trace } from "@opentelemetry/api";
import { NodeSDK, tracing } from "@opentelemetry/sdk-node";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { startNats } from "../test/fixtures/nats.mjs";
import { startPostgres } from "../test/fixtures/postgres.mjs";
import { relayOutbox } from "./outbox.mjs";

const stream = { name: "EVENTS", subjects: ["events.>"] };

test("relays a snapshot, then a command, preserving payloads and headers", async (t) => {
  // Arrange
  const otel = new NodeSDK({
    autoDetectResources: false,
    logRecordProcessors: [],
    spanProcessors: [
      new tracing.SimpleSpanProcessor(new tracing.InMemorySpanExporter()),
    ],
  });
  otel.start();
  t.after(async () => {
    await otel.shutdown();
    context.disable();
    propagation.disable();
    trace.disable();
  });
  await using postgres = await startPostgres();
  const { pool } = postgres;
  await using nats = await startNats();
  const js = jetstream(nats.nc);
  const jsm = await js.jetstreamManager();
  const abortController = new AbortController();
  const snapshot = {
    data: { id: randomUUID(), name: "Acme", version: 1 },
    datacontenttype: "application/json",
    id: randomUUID(),
    source: "/test",
    specversion: "1.0",
    type: "test.account.snapshot.v1",
  };
  const commandId = randomUUID();
  const command = { action: "add-member", user_id: randomUUID() };
  const traceparent = "00-0af7651916cd43dd8448eb211c80319c-b9c7c989f97918e1-01";

  await jsm.streams.add({ name: "EVENTS", subjects: ["events.snapshot"] });
  await jsm.streams.add({ name: "COMMANDS", subjects: ["events.command"] });
  await pool.query(
    `INSERT INTO outbox_messages (id, subject, payload, headers)
     VALUES ($1, 'events.snapshot', $2, $3)`,
    [
      snapshot.id,
      snapshot,
      {
        "Content-Type": "application/cloudevents+json",
        traceparent,
        tracestate: "vendor=value",
      },
    ],
  );

  // Act
  const task = relayOutbox({
    abortSignal: abortController.signal,
    js,
    jsm,
    pool,
  });
  try {
    await t.waitFor(
      async () => {
        assert.equal((await jsm.streams.info("EVENTS")).state.messages, 1);
      },
      { timeout: 5_000 },
    );

    // A running Relay must also discover rows queued after its first publication.
    await pool.query(
      `INSERT INTO outbox_messages (id, subject, payload, headers)
       VALUES ($1, 'events.command', $2, $3)`,
      [
        commandId,
        command,
        {
          "Content-Type": "application/json",
          "Correlation-Id": "test-request",
        },
      ],
    );
    await t.waitFor(
      async () => {
        assert.equal(
          (await pool.query("SELECT id FROM outbox_messages")).rowCount,
          0,
        );
      },
      { timeout: 5_000 },
    );
  } finally {
    abortController.abort();
    await task;
  }

  // Assert
  const storedSnapshot = await jsm.streams.getMessage("EVENTS", {
    last_by_subj: "events.snapshot",
  });
  const storedCommand = await jsm.streams.getMessage("COMMANDS", {
    last_by_subj: "events.command",
  });
  assert.ok(storedSnapshot);
  assert.ok(storedCommand);
  assert.deepEqual(storedSnapshot.json(), snapshot);
  assert.equal(
    storedSnapshot.header.get("Content-Type"),
    "application/cloudevents+json",
  );
  assert.equal(storedSnapshot.header.get("Nats-Msg-Id"), snapshot.id);
  assert.equal(storedSnapshot.header.get("Nats-Expected-Stream"), "EVENTS");
  assert.equal(
    storedSnapshot.header.get("Nats-Expected-Last-Subject-Sequence"),
    "0",
  );
  assert.match(
    storedSnapshot.header.get("traceparent"),
    /^00-0af7651916cd43dd8448eb211c80319c-[0-9a-f]{16}-01$/,
  );
  assert.notEqual(storedSnapshot.header.get("traceparent"), traceparent);
  assert.equal(storedSnapshot.header.get("tracestate"), "vendor=value");
  assert.deepEqual(storedCommand.json(), command);
  assert.equal(storedCommand.header.get("Content-Type"), "application/json");
  assert.equal(storedCommand.header.get("Correlation-Id"), "test-request");
  assert.equal(storedCommand.header.get("Nats-Msg-Id"), commandId);
  assert.equal(storedCommand.header.get("Nats-Expected-Stream"), "COMMANDS");
});

test("rejects invalid or reserved headers without losing or publishing the row", async (t) => {
  // Arrange
  await using postgres = await startPostgres();
  const { pool } = postgres;
  await using nats = await startNats();
  const js = jetstream(nats.nc);
  const jsm = await js.jetstreamManager();
  await jsm.streams.add(stream);

  for (const headers of [
    { "nAtS-Expected-Last-Subject-Sequence": "123" },
    { "Nats-Msg-Id": "override" },
    { "Nats-Rollup": "all" },
    { "Content-Type": 123 },
    { "": "empty name" },
    { "Bad:Name": "value" },
    { "Correlation-Id": "value\r\nNats-Msg-Id: override" },
  ]) {
    // Arrange
    const id = randomUUID();
    await pool.query(
      `INSERT INTO outbox_messages (id, subject, payload, headers)
       VALUES ($1, 'events.invalid', '{}', $2)`,
      [id, headers],
    );

    // Act
    const task = relayOutbox({ abortSignal: t.signal, js, jsm, pool });

    // Assert
    await assert.rejects(task, /INVALID_OUTBOX_HEADER|header/i);
    assert.deepEqual(
      (await pool.query("SELECT id FROM outbox_messages")).rows,
      [{ id }],
    );
    assert.equal((await jsm.streams.info("EVENTS")).state.messages, 0);

    // Clean up this rejected row before trying the next header.
    await pool.query("DELETE FROM outbox_messages WHERE id = $1", [id]);
  }
});

test("keeps the outbox row when JetStream is unavailable", async (t) => {
  // Arrange
  await using postgres = await startPostgres();
  const { pool } = postgres;
  await using nats = await startNats({ jetstream: false });
  const js = jetstream(nats.nc);
  const jsm = await js.jetstreamManager(false);
  const id = randomUUID();
  await pool.query(
    "INSERT INTO outbox_messages (id, subject, payload) VALUES ($1, 'events.timeout', '{}')",
    [id],
  );

  // Act
  const task = relayOutbox({ abortSignal: t.signal, js, jsm, pool });

  // Assert
  await assert.rejects(task, /JetStreamNotEnabled/);
  assert.deepEqual((await pool.query("SELECT id FROM outbox_messages")).rows, [
    { id },
  ]);
});

test("rejects a delayed older snapshot after a newer snapshot is retained", async (t) => {
  // Arrange
  await using postgres = await startPostgres();
  const { pool } = postgres;
  await using nats = await startNats();
  const js = jetstream(nats.nc);
  const jsm = await js.jetstreamManager();
  const subject = "events.resource";
  const older = { id: randomUUID(), version: 1 };
  const newer = { id: randomUUID(), version: 2 };
  const publish = js.publish.bind(js);
  const delayedPublish = t.mock.method(js, "publish");
  delayedPublish.mock.mockImplementationOnce(async () => {
    throw new Error("PUBACK_TIMEOUT");
  });

  await jsm.streams.add({ ...stream, max_msgs_per_subject: 1 });
  await pool.query(
    "INSERT INTO outbox_messages (id, subject, payload) VALUES ($1, $2, $3)",
    [older.id, subject, older],
  );

  // Act
  const failed = relayOutbox({ abortSignal: t.signal, js, jsm, pool });

  // Assert
  await assert.rejects(failed, /PUBACK_TIMEOUT/);
  assert.deepEqual(
    (await pool.query("SELECT payload FROM outbox_messages")).rows,
    [{ payload: older }],
  );

  // Arrange: the failed Relay has released its lock; the source replaces its row.
  await pool.query("DELETE FROM outbox_messages WHERE subject = $1", [subject]);
  await pool.query(
    "INSERT INTO outbox_messages (id, subject, payload) VALUES ($1, $2, $3)",
    [newer.id, subject, newer],
  );
  const abortController = new AbortController();

  // Act
  const task = relayOutbox({
    abortSignal: abortController.signal,
    js,
    jsm,
    pool,
  });
  try {
    await t.waitFor(
      async () => {
        assert.equal(
          (await pool.query("SELECT id FROM outbox_messages")).rowCount,
          0,
        );
      },
      { timeout: 5_000 },
    );
  } finally {
    abortController.abort();
    await task;
  }
  // Deliver the original attempt, with its original sequence expectation.
  const late = publish(...delayedPublish.mock.calls[0].arguments);

  // Assert
  await assert.rejects(late, /wrong last sequence/);
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
  const older = { id: randomUUID(), version: 1 };
  const newer = { id: randomUUID(), version: 2 };
  const getMessage = jsm.streams.getMessage.bind(jsm.streams);
  const client = await pool.connect();
  const {
    rows: [{ pid }],
  } = await client.query("SELECT pg_backend_pid() AS pid");

  // Reuse this session for Relay, and let its failed query report the disconnect.
  client.on("error", () => {});
  client.release();
  await jsm.streams.add({ ...stream, max_msgs_per_subject: 1 });
  await pool.query(
    "INSERT INTO outbox_messages (id, subject, payload) VALUES ($1, $2, $3)",
    [older.id, subject, older],
  );
  t.mock.method(
    jsm.streams,
    "getMessage",
    async () => {
      await pool.query("SELECT pg_terminate_backend($1)", [pid]);
      await pool.query("DELETE FROM outbox_messages WHERE id = $1", [older.id]);
      await js.publish(subject, JSON.stringify(newer), {
        expect: { lastSubjectSequence: 0 },
        msgID: newer.id,
      });
      return getMessage("EVENTS", { last_by_subj: subject });
    },
    { times: 1 },
  );

  // Act
  const task = relayOutbox({ abortSignal: t.signal, js, jsm, pool });

  // Assert
  await assert.rejects(task, /connection|queryable|terminat/i);
  const retained = await jsm.streams.getMessage("EVENTS", {
    last_by_subj: subject,
  });
  assert.ok(retained);
  assert.deepEqual(retained.json(), newer);
});
