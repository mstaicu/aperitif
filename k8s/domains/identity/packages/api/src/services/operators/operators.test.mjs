import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { createOperatorsService } from "./index.mjs";

test("operators assign and revoke operator access", async (t) => {
  // Arrange
  const db = await startPostgres(t);
  const operators = createOperatorsService({ db });
  const operatorId = randomUUID();
  const userId = randomUUID();

  await db.query("INSERT INTO users (id) VALUES ($1), ($2)", [
    operatorId,
    userId,
  ]);
  await db.query("INSERT INTO operators (user_id) VALUES ($1)", [operatorId]);

  // Act
  const assigned = await operators.assignOperator({ userId });
  const revoked = await operators.revokeOperator({ userId });

  // Assert
  assert.deepEqual(assigned, { user_id: userId });
  assert.deepEqual(revoked, { user_id: userId });

  await assert.rejects(
    operators.revokeOperator({ userId: operatorId }),
    /FORBIDDEN/,
  );
});
