import assert from "node:assert/strict";
import test from "node:test";

import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { createEntitlementsService } from "./index.mjs";

test("entitlements list entitlement definitions", async () => {
  // Arrange
  await using db = await startPostgres();
  const entitlements = createEntitlementsService({ db });

  await db.query(
    `
      INSERT INTO entitlements (
        id,
        name,
        value_type,
        merge_strategy
      )
      VALUES (
        'test.enabled',
        'Test Enabled',
        'boolean',
        'boolean_or'
      )
    `,
  );

  // Act
  const listed = await entitlements.listEntitlements();

  // Assert
  assert.ok(
    listed.entitlements.some(
      (entitlement) =>
        entitlement.id === "test.enabled" &&
        entitlement.name === "Test Enabled" &&
        entitlement.value_type === "boolean" &&
        entitlement.merge_strategy === "boolean_or",
    ),
  );
});
