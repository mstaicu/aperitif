import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { startNats } from "../../test/fixtures/nats.mjs";
import { startPostgres } from "../../test/fixtures/postgres.mjs";
import { ensureAccountsStream } from "../platform/messaging/accounts-stream.mjs";
import { runPublishOutbox } from "./publish-outbox.mjs";

test("publishes unpublished outbox events to NATS", async (t) => {
  // Arrange
  const db = await startPostgres(t);
  const nats = await startNats(t);
  const controller = new AbortController();
  const accountId = randomUUID();
  const event = {
    id: randomUUID(),
    payload: {
      account: {
        id: accountId,
      },
      member: {
        account_id: accountId,
        active: true,
        role_id: "owner",
        user_id: randomUUID(),
      },
      permissions: [
        {
          id: "members.manage",
          value: true,
        },
      ],
    },
    schema_version: 1,
    subject: "accounts.account_member.updated",
    version: 1,
  };

  await ensureAccountsStream({ nats, streamReplicas: 1 });

  const subscription = nats.nc.subscribe(event.subject, {
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
