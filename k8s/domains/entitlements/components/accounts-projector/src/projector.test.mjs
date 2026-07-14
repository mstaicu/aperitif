import { AccountOpenedV1Type } from "@mstaicu/accounts-contracts";
import {
  DiscardPolicy,
  jetstream,
  jetstreamManager,
  RetentionPolicy,
  StorageType,
} from "@nats-io/jetstream";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { setTimeout } from "node:timers/promises";

import { startNats } from "../test/fixtures/nats.mjs";
import { startPostgres } from "../test/fixtures/postgres.mjs";
import {
  ACCOUNTS_CONSUMER,
  ACCOUNTS_STREAM,
  getConsumer,
} from "./platform/nats.mjs";
import { projections } from "./projections/index.mjs";
import { project } from "./projector.mjs";

test("projects account opened events", async () => {
  // Arrange
  await using db = await startPostgres();
  await using nats = await startNats();
  const js = jetstream(nats.nc);
  const jsm = await jetstreamManager(nats.nc);
  const accountId = randomUUID();
  const userId = randomUUID();
  const event = {
    data: {
      account: {
        id: accountId,
        type: "business",
      },
      member: {
        role: "owner",
        user_id: userId,
      },
      version: 1,
    },
    datacontenttype: "application/json",
    id: randomUUID(),
    source: "/domains/accounts",
    specversion: "1.0",
    time: new Date().toISOString(),
    type: AccountOpenedV1Type,
  };

  const controller = new AbortController();
  const task = project({
    db,
    nc: nats.nc,
    projections,
    signal: controller.signal,
  });

  await setTimeout(100);
  await jsm.streams.add({
    discard: DiscardPolicy.New,
    name: ACCOUNTS_STREAM,
    num_replicas: 1,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    subjects: ["accounts.>"],
  });

  // Act
  await js.publish(event.type, JSON.stringify(event));

  let projectedAccount;

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const {
      rows: [row],
    } = await db.query(
      `
      SELECT account_id,
          type,
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
  await task;

  // Assert
  assert.deepEqual(projectedAccount, {
    account_id: accountId,
    type: "business",
    version: "1",
  });
});

test("ignores stale account opened events", async () => {
  // Arrange
  await using db = await startPostgres();
  await using nats = await startNats();
  const js = jetstream(nats.nc);
  const jsm = await jetstreamManager(nats.nc);
  const accountId = randomUUID();
  const staleEvent = {
    data: {
      account: {
        id: accountId,
        type: "personal",
      },
      member: {
        role: "owner",
        user_id: randomUUID(),
      },
      version: 1,
    },
    datacontenttype: "application/json",
    id: randomUUID(),
    source: "/domains/accounts",
    specversion: "1.0",
    time: new Date().toISOString(),
    type: AccountOpenedV1Type,
  };

  await jsm.streams.add({
    discard: DiscardPolicy.New,
    name: ACCOUNTS_STREAM,
    num_replicas: 1,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    subjects: ["accounts.>"],
  });
  const controller = new AbortController();

  await getConsumer({
    nc: nats.nc,
    signal: controller.signal,
    subjects: Object.keys(projections),
  });

  await db.query(
    `
      INSERT INTO projected_accounts (
        account_id,
        type,
        version
      )
      VALUES ($1, $2, $3)
    `,
    [accountId, "business", 2],
  );

  // Act
  const task = project({
    db,
    nc: nats.nc,
    projections,
    signal: controller.signal,
  });

  await js.publish(staleEvent.type, JSON.stringify(staleEvent));

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const consumer = await jsm.consumers.info(
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
        type,
        version
      FROM projected_accounts
      WHERE account_id = $1
    `,
    [accountId],
  );

  controller.abort();
  await task;

  // Assert
  assert.deepEqual(projectedAccount, {
    account_id: accountId,
    type: "business",
    version: "2",
  });
});
