import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  AccountMemberUpdatedSchemaVersion,
  AccountMemberUpdatedSubject,
  buildAccountMemberUpdatedEvent,
} from "./index.mjs";

test("builds account member updated events", () => {
  // Arrange
  const accountId = randomUUID();
  const userId = randomUUID();
  /** @type {import("./index.mjs").AccountMemberUpdatedPayload} */
  const payload = {
    account: {
      id: accountId,
    },
    member: {
      account_id: accountId,
      active: true,
      role_id: "owner",
      user_id: userId,
    },
    permissions: [
      {
        id: "members.manage",
        value: true,
      },
    ],
  };

  // Act
  const event = buildAccountMemberUpdatedEvent(payload, 1);

  // Assert
  assert.equal(typeof event.id, "string");
  assert.equal(event.subject, AccountMemberUpdatedSubject);
  assert.equal(event.schema_version, AccountMemberUpdatedSchemaVersion);
  assert.equal(event.version, 1);
  assert.deepEqual(event.payload, payload);
});

test("rejects invalid account member updated payloads", () => {
  // Arrange
  const payload = {
    account: {
      id: randomUUID(),
    },
    member: {
      active: true,
      role_id: "owner",
      user_id: randomUUID(),
    },
    permissions: [],
  };

  // Act
  const buildEvent = () =>
    buildAccountMemberUpdatedEvent(/** @type {any} */ (payload), 1);

  // Assert
  assert.throws(buildEvent, /INVALID_EVENT_PAYLOAD/);
});

test("rejects invalid account member updated versions", () => {
  // Arrange
  const accountId = randomUUID();
  /** @type {import("./index.mjs").AccountMemberUpdatedPayload} */
  const payload = {
    account: {
      id: accountId,
    },
    member: {
      account_id: accountId,
      active: true,
      role_id: "owner",
      user_id: randomUUID(),
    },
    permissions: [],
  };

  // Act
  const buildEvent = () => buildAccountMemberUpdatedEvent(payload, 0);

  // Assert
  assert.throws(buildEvent, /INVALID_EVENT_VERSION/);
});
