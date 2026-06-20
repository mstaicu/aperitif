import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  AccountCapabilitiesUpdatedSchemaVersion,
  AccountCapabilitiesUpdatedSubject,
  buildAccountCapabilitiesUpdatedEvent,
} from "./index.mjs";

test("builds account capabilities updated events", () => {
  // Arrange
  const payload = {
    account: {
      id: randomUUID(),
    },
    capabilities: [
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
  const event = buildAccountCapabilitiesUpdatedEvent(payload, 1);

  // Assert
  assert.equal(typeof event.id, "string");
  assert.equal(event.subject, AccountCapabilitiesUpdatedSubject);
  assert.equal(event.schema_version, AccountCapabilitiesUpdatedSchemaVersion);
  assert.equal(event.version, 1);
  assert.deepEqual(event.payload, payload);
});

test("rejects invalid account capabilities updated payloads", () => {
  // Arrange
  const payload = {
    account: {
      id: randomUUID(),
    },
    capabilities: [
      {
        id: "test.enabled",
        value: "yes",
      },
    ],
  };

  // Act
  const buildEvent = () =>
    buildAccountCapabilitiesUpdatedEvent(/** @type {any} */ (payload), 1);

  // Assert
  assert.throws(buildEvent, /INVALID_EVENT_PAYLOAD/);
});

test("rejects invalid account capabilities updated versions", () => {
  // Arrange
  const payload = {
    account: {
      id: randomUUID(),
    },
    capabilities: [],
  };

  // Act
  const buildEvent = () => buildAccountCapabilitiesUpdatedEvent(payload, 0);

  // Assert
  assert.throws(buildEvent, /INVALID_EVENT_VERSION/);
});
