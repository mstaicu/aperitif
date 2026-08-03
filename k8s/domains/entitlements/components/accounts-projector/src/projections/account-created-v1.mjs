import { AccountCreatedV1EventCheck } from "@mstaicu/accounts-contracts";

/**
 * @param {{
 *   event: unknown,
 *   pool: import("pg").Pool,
 * }} args
 */
export async function projectAccountCreatedV1({ event, pool }) {
  if (!AccountCreatedV1EventCheck.Check(event)) {
    throw new Error("INVALID_ACCOUNT_CREATED_EVENT");
  }

  const { data } = event;

  await pool.query(
    `
      INSERT INTO projected_accounts (
        account_id,
        version
      )
      VALUES ($1, $2)
      ON CONFLICT (account_id) DO UPDATE
      SET version = EXCLUDED.version
      WHERE projected_accounts.version < EXCLUDED.version
    `,
    [data.account.id, data.version],
  );
}
