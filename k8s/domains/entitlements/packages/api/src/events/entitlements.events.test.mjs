import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  AccountEntitlementsUpdatedSchemaVersion,
  AccountEntitlementsUpdatedSubject,
  buildAccountEntitlementsUpdatedEvent,
} from "./index.mjs";

test("builds account entitlements updated events", () => {
  // Arrange
  const payload = {
    account: {
      id: randomUUID(),
    },
    entitlements: [
      {
        id: "test.max",
        value: 10,
      },
      {
        id: "test.enabled",
        value: true,
      },
    ],
  };

  // Act
  const event = buildAccountEntitlementsUpdatedEvent(payload, 1);

  // Assert
  assert.equal(typeof event.id, "string");
  assert.equal(event.subject, AccountEntitlementsUpdatedSubject);
  assert.equal(event.schema_version, AccountEntitlementsUpdatedSchemaVersion);
  assert.equal(event.version, 1);
  assert.deepEqual(event.payload, payload);
});

test("rejects invalid account entitlements updated payloads", () => {
  // Arrange
  const payload = {
    account: {
      id: randomUUID(),
    },
    entitlements: [
      {
        id: "test.enabled",
        value: "yes",
      },
    ],
  };

  // Act
  const buildEvent = () =>
    buildAccountEntitlementsUpdatedEvent(/** @type {any} */ (payload), 1);

  // Assert
  assert.throws(buildEvent, /INVALID_EVENT_PAYLOAD/);
});

test("rejects invalid account entitlements updated versions", () => {
  // Arrange
  const payload = {
    account: {
      id: randomUUID(),
    },
    entitlements: [],
  };

  // Act
  const buildEvent = () => buildAccountEntitlementsUpdatedEvent(payload, 0);

  // Assert
  assert.throws(buildEvent, /INVALID_EVENT_VERSION/);
});
