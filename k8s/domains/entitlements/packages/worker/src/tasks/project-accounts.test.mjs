import {
  DiscardPolicy,
  RetentionPolicy,
  StorageType,
} from "@nats-io/jetstream";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { setTimeout } from "node:timers/promises";

import { startNats } from "../../test/fixtures/nats.mjs";
import { startPostgres } from "../../test/fixtures/postgres.mjs";
import {
  ACCOUNTS_CONSUMER,
  ACCOUNTS_STREAM,
  ensureAccountsConsumer,
} from "../platform/messaging/accounts-consumer.mjs";
import { runProjectAccounts } from "./project-accounts.mjs";

const AccountOpenedSchemaVersion = 1;
const AccountOpenedSubject = "accounts.account.opened";

test("projects account opened events", async (t) => {
  // Arrange
  const db = await startPostgres(t);
  const nats = await startNats(t);
  const accountId = randomUUID();
  const userId = randomUUID();
  const event = {
    id: randomUUID(),
    payload: {
      account: {
        id: accountId,
      },
      member: {
        role: "owner",
        user_id: userId,
      },
    },
    schema_version: AccountOpenedSchemaVersion,
    subject: AccountOpenedSubject,
    version: 1,
  };

  await nats.jsm.streams.add({
    discard: DiscardPolicy.New,
    name: ACCOUNTS_STREAM,
    num_replicas: 1,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    subjects: ["accounts.>"],
  });
  await ensureAccountsConsumer({ nats });

  // Act
  const controller = new AbortController();
  const task = runProjectAccounts({ db, nats }, controller.signal);

  await nats.js.publish(event.subject, JSON.stringify(event));

  let projectedAccount;

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const {
      rows: [row],
    } = await db.query(
      `
        SELECT account_id,
          version
        FROM projected_accounts
        WHERE account_id = $1
      `,
      [accountId],
    );

    if (row) {
      projectedAccount = row;
      break;
    }

    await setTimeout(100);
  }

  controller.abort();
  await task.catch((err) => {
    if (err?.name !== "AbortError") {
      throw err;
    }
  });

  // Assert
  assert.deepEqual(projectedAccount, {
    account_id: accountId,
    version: "1",
  });
});

test("ignores stale account opened events", async (t) => {
  // Arrange
  const db = await startPostgres(t);
  const nats = await startNats(t);
  const accountId = randomUUID();
  const staleEvent = {
    id: randomUUID(),
    payload: {
      account: {
        id: accountId,
      },
      member: {
        role: "owner",
        user_id: randomUUID(),
      },
    },
    schema_version: AccountOpenedSchemaVersion,
    subject: AccountOpenedSubject,
    version: 1,
  };

  await nats.jsm.streams.add({
    discard: DiscardPolicy.New,
    name: ACCOUNTS_STREAM,
    num_replicas: 1,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    subjects: ["accounts.>"],
  });
  await ensureAccountsConsumer({ nats });

  await db.query(
    `
      INSERT INTO projected_accounts (
        account_id,
        version
      )
      VALUES ($1, $2)
    `,
    [accountId, 2],
  );

  // Act
  const controller = new AbortController();
  const task = runProjectAccounts({ db, nats }, controller.signal);

  await nats.js.publish(staleEvent.subject, JSON.stringify(staleEvent));

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const consumer = await nats.jsm.consumers.info(
      ACCOUNTS_STREAM,
      ACCOUNTS_CONSUMER,
    );

    if (consumer.num_ack_pending === 0 && consumer.num_pending === 0) {
      break;
    }

    await setTimeout(100);
  }

  const {
    rows: [projectedAccount],
  } = await db.query(
    `
      SELECT account_id,
        version
      FROM projected_accounts
      WHERE account_id = $1
    `,
    [accountId],
  );

  controller.abort();
  await task.catch((err) => {
    if (err?.name !== "AbortError") {
      throw err;
    }
  });

  // Assert
  assert.deepEqual(projectedAccount, {
    account_id: accountId,
    version: "2",
  });
});
