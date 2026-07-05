import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  AccountOpenedSchemaVersion,
  AccountOpenedSubject,
  buildAccountOpenedEvent,
} from "./index.mjs";

test("builds account opened events", () => {
  // Arrange
  const accountId = randomUUID();
  const userId = randomUUID();
  /** @type {import("./index.mjs").AccountOpenedPayload} */
  const payload = {
    account: {
      id: accountId,
    },
    member: {
      role: "owner",
      user_id: userId,
    },
  };

  // Act
  const event = buildAccountOpenedEvent(payload, 1);

  // Assert
  assert.equal(typeof event.id, "string");
  assert.equal(event.subject, AccountOpenedSubject);
  assert.equal(event.schema_version, AccountOpenedSchemaVersion);
  assert.equal(event.version, 1);
  assert.deepEqual(event.payload, payload);
});

test("rejects invalid account opened versions", () => {
  // Arrange
  /** @type {import("./index.mjs").AccountOpenedPayload} */
  const payload = {
    account: {
      id: randomUUID(),
    },
    member: {
      role: "owner",
      user_id: randomUUID(),
    },
  };

  // Act
  const buildEvent = () => buildAccountOpenedEvent(payload, 0);

  // Assert
  assert.throws(buildEvent, /INVALID_EVENT_VERSION/);
});
