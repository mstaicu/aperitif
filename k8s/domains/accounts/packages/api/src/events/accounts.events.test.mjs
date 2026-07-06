import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  AccountOpenedEventCheck,
  AccountOpenedSource,
  AccountOpenedType,
} from "@mstaicu/accounts-contracts";

import { buildAccountOpenedEvent } from "./index.mjs";

test("builds account opened events", () => {
  // Arrange
  const accountId = randomUUID();
  const userId = randomUUID();
  const data = {
    account: {
      id: accountId,
    },
    member: {
      role: "owner",
      user_id: userId,
    },
  };

  // Act
  const event = buildAccountOpenedEvent(data, 1);

  // Assert
  assert.equal(AccountOpenedEventCheck.Check(event), true);
  assert.equal(event.datacontenttype, "application/json");
  assert.equal(typeof event.id, "string");
  assert.equal(event.source, AccountOpenedSource);
  assert.equal(event.specversion, "1.0");
  assert.equal(typeof event.time, "string");
  assert.equal(event.type, AccountOpenedType);
  assert.deepEqual(event.data, {
    ...data,
    version: 1,
  });
});

test("rejects invalid account opened versions", () => {
  // Arrange
  const data = {
    account: {
      id: randomUUID(),
    },
    member: {
      role: "owner",
      user_id: randomUUID(),
    },
  };

  // Act
  const buildEvent = () => buildAccountOpenedEvent(data, 0);

  // Assert
  assert.throws(buildEvent, /INVALID_EVENT_VERSION/);
});
