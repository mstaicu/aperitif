import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  AccountEntitlementsUpdatedEventCheck,
  AccountEntitlementsUpdatedSource,
  AccountEntitlementsUpdatedType,
} from "@mstaicu/entitlements-contracts";

import { buildAccountEntitlementsUpdatedEvent } from "./index.mjs";

test("builds account entitlements updated events", () => {
  // Arrange
  const data = {
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
  const event = buildAccountEntitlementsUpdatedEvent(data, 1);

  // Assert
  assert.equal(AccountEntitlementsUpdatedEventCheck.Check(event), true);
  assert.equal(event.datacontenttype, "application/json");
  assert.equal(typeof event.id, "string");
  assert.equal(event.source, AccountEntitlementsUpdatedSource);
  assert.equal(event.specversion, "1.0");
  assert.equal(typeof event.time, "string");
  assert.equal(event.type, AccountEntitlementsUpdatedType);
  assert.deepEqual(event.data, {
    ...data,
    version: 1,
  });
});

test("rejects invalid account entitlements updated versions", () => {
  // Arrange
  const data = {
    account: {
      id: randomUUID(),
    },
    entitlements: [],
  };

  // Act
  const buildEvent = () => buildAccountEntitlementsUpdatedEvent(data, 0);

  // Assert
  assert.throws(buildEvent, /INVALID_EVENT_VERSION/);
});
