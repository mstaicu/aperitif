import {
  AccountV1SubjectPrefix,
  buildAccountV1Subject,
} from "@mstaicu/accounts-contracts";
import {
  AckPolicy,
  DeliverPolicy,
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
import { drain } from "./drain.mjs";

const accountsStream = {
  discard: DiscardPolicy.New,
  discard_new_per_subject: false,
  max_age: 0,
  max_bytes: 419_430_400,
  max_msgs_per_subject: 1,
  name: "ACCOUNTS",
  num_replicas: 1,
  retention: RetentionPolicy.Limits,
  storage: StorageType.File,
  subjects: [`${AccountV1SubjectPrefix}.>`],
};

test("publishes queued and newly inserted outbox events", async () => {
  // Arrange
  await using postgres = await startPostgres();
  const { pool } = postgres;
  await using nats = await startNats();
  const controller = new AbortController();
  const queuedEvent = {
    id: randomUUID(),
    type: "accounts.test.queued",
  };
  const queuedSubject = buildAccountV1Subject(randomUUID());
  const notifiedEvent = {
    id: randomUUID(),
    type: "accounts.test.notified",
  };
  const notifiedSubject = buildAccountV1Subject(randomUUID());

  const js = jetstream(nats.nc);
  const jsm = await js.jetstreamManager();

  await jsm.streams.add(accountsStream);

  const subscription = nats.nc.subscribe("accounts.account.v1.*", {
    max: 2,
    timeout: 5000,
  });

  await pool.query(
    `
      INSERT INTO outbox_events (id, subject, event)
      VALUES ($1, $2, $3::jsonb)
    `,
    [queuedEvent.id, queuedSubject, JSON.stringify(queuedEvent)],
  );

  // Act
  const messages = subscription[Symbol.asyncIterator]();
  const task = drain({
    js,
    pool,
    signal: controller.signal,
  });
  const { value: queuedMessage } = await messages.next();

  // Let the outbox process return to LISTEN after draining the queued event.
  await setTimeout(250);
  await pool.query(
    `
      INSERT INTO outbox_events (id, subject, event)
      VALUES ($1, $2, $3::jsonb)
    `,
    [notifiedEvent.id, notifiedSubject, JSON.stringify(notifiedEvent)],
  );

  const { value: notifiedMessage } = await messages.next();
  controller.abort();
  await task;

  // Assert
  for (const [message, event, subject] of [
    [queuedMessage, queuedEvent, queuedSubject],
    [notifiedMessage, notifiedEvent, notifiedSubject],
  ]) {
    assert.ok(message);
    assert.deepEqual(JSON.parse(new TextDecoder().decode(message.data)), event);
    assert.equal(message.headers?.get("Nats-Msg-Id"), event.id);
    assert.equal(message.subject, subject);
  }

  const {
    rows: [{ count }],
  } = await pool.query(
    `
      SELECT count(*)::integer AS count
      FROM outbox_events
      WHERE id = ANY($1::uuid[])
    `,
    [[queuedEvent.id, notifiedEvent.id]],
  );

  assert.equal(count, 0);
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
    type: "accounts.test",
  };
  const subject = buildAccountV1Subject(randomUUID());

  await pool.query(
    `
      INSERT INTO outbox_events (id, subject, event)
      VALUES ($1, $2, $3::jsonb)
    `,
    [event.id, subject, JSON.stringify(event)],
  );

  // Act
  const publish = drain({
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
      SELECT id
      FROM outbox_events
      WHERE id = $1
    `,
    [event.id],
  );

  assert.equal(outbox.id, event.id);
});

test("retains one current Account representation per subject", async () => {
  await using nats = await startNats();
  const js = jetstream(nats.nc);
  const jsm = await js.jetstreamManager();
  const accountASubject = buildAccountV1Subject(randomUUID());
  const accountBSubject = buildAccountV1Subject(randomUUID());

  await jsm.streams.add(accountsStream);

  await js.publish(accountASubject, JSON.stringify({ version: 1 }));
  await js.publish(accountASubject, JSON.stringify({ version: 2 }));
  await js.publish(accountBSubject, JSON.stringify({ version: 1 }));

  const info = await jsm.streams.info("ACCOUNTS");

  assert.equal(info.config.max_age, 0);
  assert.equal(info.config.max_msgs_per_subject, 1);
  assert.deepEqual(info.config.subjects, ["accounts.account.v1.>"]);
  assert.equal(info.config.discard, DiscardPolicy.New);
  assert.equal(info.state.messages, 2);

  const consumerInfo = await jsm.consumers.add("ACCOUNTS", {
    ack_policy: AckPolicy.Explicit,
    deliver_policy: DeliverPolicy.LastPerSubject,
    filter_subject: "accounts.account.v1.>",
  });

  const consumer = js.consumers.getConsumerFromInfo(consumerInfo);
  const messages = await consumer.fetch({ expires: 1000, max_messages: 2 });
  const baseline = [];

  for await (const message of messages) {
    baseline.push({
      subject: message.subject,
      value: JSON.parse(new TextDecoder().decode(message.data)),
    });
    message.ack();
  }

  assert.deepEqual(
    baseline.sort((left, right) => left.subject.localeCompare(right.subject)),
    [
      { subject: accountASubject, value: { version: 2 } },
      { subject: accountBSubject, value: { version: 1 } },
    ].sort((left, right) => left.subject.localeCompare(right.subject)),
  );

  await js.publish(accountASubject, JSON.stringify({ version: 3 }));

  const update = await consumer.next({ expires: 1000 });

  assert.ok(update);
  assert.equal(update.subject, accountASubject);
  assert.deepEqual(JSON.parse(new TextDecoder().decode(update.data)), {
    version: 3,
  });
  update.ack();
});
