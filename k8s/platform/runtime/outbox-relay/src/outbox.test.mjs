import {
  DiscardPolicy,
  jetstream,
  RetentionPolicy,
  StorageType,
} from "@nats-io/jetstream";
import { context, propagation, trace } from "@opentelemetry/api";
import { NodeSDK, tracing } from "@opentelemetry/sdk-node";
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

test("relays snapshot and command payloads with their headers to separate streams", async (t) => {
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
  const { nc } = nats;
  const abortController = new AbortController();
  const js = jetstream(nc);
  const jsm = await js.jetstreamManager();
  const queued = {
    data: { id: randomUUID(), name: "Acme", version: 1 },
    datacontenttype: "application/json",
    id: randomUUID(),
    source: "/test",
    specversion: "1.0",
    type: "test.account.snapshot.v1",
  };
  const commandId = randomUUID();
  const command = {
    action: "add-member",
    user_id: randomUUID(),
  };
  const traceparent = "00-0af7651916cd43dd8448eb211c80319c-b9c7c989f97918e1-01";

  await jsm.streams.add({ ...stream, subjects: ["events.snapshot"] });
  await jsm.streams.add({
    ...stream,
    name: "COMMANDS",
    subjects: ["events.command"],
  });

  const subscription = nc.subscribe("events.>", {
    max: 2,
    timeout: 5_000,
  });
  const messages = subscription[Symbol.asyncIterator]();

  await pool.query(
    `
      INSERT INTO outbox_messages (id, subject, payload, headers)
      VALUES ($1, 'events.snapshot', $2::jsonb, $3::jsonb)
    `,
    [
      queued.id,
      JSON.stringify(queued),
      JSON.stringify({
        "Content-Type": "application/cloudevents+json",
        traceparent,
        tracestate: "vendor=value",
      }),
    ],
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
      INSERT INTO outbox_messages (id, subject, payload, headers)
      VALUES ($1, 'events.command', $2::jsonb, $3::jsonb)
    `,
    [
      commandId,
      JSON.stringify(command),
      JSON.stringify({
        "Content-Type": "application/json",
        "Correlation-Id": "test-request",
      }),
    ],
  );

  const { value: commandMessage } = await messages.next();

  abortController.abort();
  await task;

  // Assert
  assert.ok(queuedMessage);
  assert.ok(commandMessage);
  assert.deepEqual(
    JSON.parse(new TextDecoder().decode(queuedMessage.data)),
    queued,
  );
  assert.equal(queuedMessage.subject, "events.snapshot");
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
  assert.match(
    queuedMessage.headers?.get("traceparent") ?? "",
    /^00-0af7651916cd43dd8448eb211c80319c-[0-9a-f]{16}-01$/,
  );
  assert.notEqual(queuedMessage.headers?.get("traceparent"), traceparent);
  assert.equal(queuedMessage.headers?.get("tracestate"), "vendor=value");
  assert.deepEqual(
    JSON.parse(new TextDecoder().decode(commandMessage.data)),
    command,
  );
  assert.equal(commandMessage.subject, "events.command");
  assert.equal(commandMessage.headers?.get("Content-Type"), "application/json");
  assert.equal(commandMessage.headers?.get("Correlation-Id"), "test-request");
  assert.equal(commandMessage.headers?.get("Nats-Msg-Id"), commandId);
  assert.equal(commandMessage.headers?.get("Nats-Expected-Stream"), "COMMANDS");
  const storedCommand = await jsm.streams.getMessage("COMMANDS", {
    last_by_subj: "events.command",
  });
  assert.deepEqual(storedCommand?.json(), command);

  const {
    rows: [{ count }],
  } = await pool.query(
    `
      SELECT count(*)::integer AS count
      FROM outbox_messages
    `,
  );

  assert.equal(count, 0);
});

test("keeps messages with invalid or reserved headers without publishing them", async () => {
  // Arrange
  await using postgres = await startPostgres();
  const { pool } = postgres;
  await using nats = await startNats();
  const js = jetstream(nats.nc);
  const jsm = await js.jetstreamManager();
  await jsm.streams.add(stream);
  const invalidHeaders = [
    { "nAtS-Expected-Last-Subject-Sequence": "123" },
    { "Nats-Msg-Id": "override" },
    { "Nats-Rollup": "all" },
    { "Content-Type": 123 },
    { "": "empty name" },
    { "Bad:Name": "value" },
    { "Correlation-Id": "value\r\nNats-Msg-Id: override" },
  ];

  for (const headers of invalidHeaders) {
    const id = randomUUID();
    await pool.query(
      "INSERT INTO outbox_messages (id, subject, payload, headers) VALUES ($1, 'events.invalid', '{}', $2)",
      [id, headers],
    );

    // Act & Assert
    await assert.rejects(
      relayOutbox({
        abortSignal: new AbortController().signal,
        js,
        jsm,
        pool,
      }),
      /INVALID_OUTBOX_HEADER|header/i,
    );
    const { rows } = await pool.query("SELECT id FROM outbox_messages");
    assert.deepEqual(rows, [{ id }]);
    const info = await jsm.streams.info("EVENTS");
    assert.equal(info.state.messages, 0);

    await pool.query("DELETE FROM outbox_messages WHERE id = $1", [id]);
  }
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
      INSERT INTO outbox_messages (id, subject, payload)
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
      FROM outbox_messages
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
    data: { version: 1 },
    id: randomUUID(),
    type: "test.snapshot",
  };
  const newer = {
    data: { version: 2 },
    id: randomUUID(),
    type: "test.snapshot",
  };
  const publish = js.publish.bind(js);
  /** @type {(() => ReturnType<typeof js.publish>) | undefined} */
  let publishLate;

  await jsm.streams.add({ ...stream, max_msgs_per_subject: 1 });
  await pool.query(
    "INSERT INTO outbox_messages (id, subject, payload) VALUES ($1, $2, $3)",
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
    await client.query("DELETE FROM outbox_messages WHERE subject = $1", [
      subject,
    ]);
    await client.query(
      "INSERT INTO outbox_messages (id, subject, payload) VALUES ($1, $2, $3)",
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
        const { rowCount } = await pool.query("SELECT id FROM outbox_messages");
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
    data: { version: 1 },
    id: randomUUID(),
    type: "test.snapshot",
  };
  const newer = {
    data: { version: 2 },
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
    "INSERT INTO outbox_messages (id, subject, payload) VALUES ($1, $2, $3)",
    [older.id, subject, older],
  );
  t.mock.method(
    jsm.streams,
    "getMessage",
    async (/** @type {Parameters<typeof getMessage>} */ ...args) => {
      await pool.query("SELECT pg_terminate_backend($1)", [pid]);
      await pool.query("DELETE FROM outbox_messages WHERE id = $1", [older.id]);
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
