import assert from "node:assert/strict";
import test from "node:test";

import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { createCapabilitiesService } from "./index.mjs";

test("capabilities list capability definitions", async (t) => {
  // Arrange
  const db = await startPostgres(t);
  const capabilities = createCapabilitiesService({ db });

  await db.query(
    `
      INSERT INTO capabilities (
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
  const listed = await capabilities.listCapabilities();

  // Assert
  assert.ok(
    listed.capabilities.some(
      (capability) =>
        capability.id === "test.enabled" &&
        capability.name === "Test Enabled" &&
        capability.value_type === "boolean" &&
        capability.merge_strategy === "boolean_or",
    ),
  );
});
