import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { createOperatorsService } from "./index.mjs";

test("operators cannot remove the last operator", async () => {
  await using postgres = await startPostgres();
  const { pool } = postgres;
  const operators = createOperatorsService({ pool });
  const operatorId = randomUUID();
  const userId = randomUUID();

  await pool.query("INSERT INTO users (id) VALUES ($1), ($2)", [
    operatorId,
    userId,
  ]);
  await pool.query("INSERT INTO operators (user_id) VALUES ($1)", [operatorId]);

  await operators.assignOperator({ userId });
  await operators.revokeOperator({ userId });
  await assert.rejects(
    operators.revokeOperator({ userId: operatorId }),
    /FORBIDDEN/,
  );
});
