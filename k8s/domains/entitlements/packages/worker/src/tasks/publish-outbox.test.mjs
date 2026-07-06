import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { startNats } from "../../test/fixtures/nats.mjs";
import { startPostgres } from "../../test/fixtures/postgres.mjs";
import { ensureEntitlementsStream } from "../platform/messaging/entitlements-stream.mjs";
import { runPublishOutbox } from "./publish-outbox.mjs";

test("publishes unpublished outbox events to NATS", async (t) => {
  // Arrange
  const db = await startPostgres(t);
  const nats = await startNats(t);
  const controller = new AbortController();
  const accountId = randomUUID();
  const event = {
    datacontenttype: "application/json",
    data: {
      account: {
        id: accountId,
      },
      entitlements: [
        {
          id: "members.max",
          value: 10,
        },
      ],
      version: 1,
    },
    id: randomUUID(),
    source: "/domains/entitlements",
    specversion: "1.0",
    time: new Date().toISOString(),
    type: "entitlements.account_entitlements.updated.v1",
  };

  await ensureEntitlementsStream({ nats, streamReplicas: 1 });

  const subscription = nats.nc.subscribe(event.type, {
    max: 1,
    timeout: 5000,
  });

  await db.query(
    `
      INSERT INTO outbox_events (id, event)
      VALUES ($1, $2::jsonb)
    `,
    [event.id, JSON.stringify(event)],
  );

  // Act
  const messageReceived = (async () => {
    for await (const message of subscription) {
      return message;
    }
  })();
  const task = runPublishOutbox({ db, nats }, controller.signal);
  const message = await messageReceived;
  controller.abort();
  await task;

  // Assert
  assert.ok(message);
  assert.deepEqual(JSON.parse(new TextDecoder().decode(message.data)), event);

  const {
    rows: [outbox],
  } = await db.query(
    `
      SELECT published_at
      FROM outbox_events
      WHERE id = $1
    `,
    [event.id],
  );

  assert.ok(outbox.published_at);
});

test("keeps outbox events unpublished when NATS publish fails", async (t) => {
  // Arrange
  const db = await startPostgres(t);
  const nats = await startNats(t);
  const controller = new AbortController();
  const accountId = randomUUID();
  const event = {
    datacontenttype: "application/json",
    data: {
      account: {
        id: accountId,
      },
      entitlements: [
        {
          id: "members.max",
          value: 10,
        },
      ],
      version: 1,
    },
    id: randomUUID(),
    source: "/domains/entitlements",
    specversion: "1.0",
    time: new Date().toISOString(),
    type: "entitlements.account_entitlements.updated.v1",
  };

  await db.query(
    `
      INSERT INTO outbox_events (id, event)
      VALUES ($1, $2::jsonb)
    `,
    [event.id, JSON.stringify(event)],
  );

  // Act
  const publish = runPublishOutbox({ db, nats }, controller.signal);

  // Assert
  await assert.rejects(publish);

  const {
    rows: [outbox],
  } = await db.query(
    `
      SELECT published_at
      FROM outbox_events
      WHERE id = $1
    `,
    [event.id],
  );

  assert.equal(outbox.published_at, null);
});
