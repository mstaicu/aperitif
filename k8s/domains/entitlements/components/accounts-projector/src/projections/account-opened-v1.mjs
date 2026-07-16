import { AccountOpenedV1EventCheck } from "@mstaicu/accounts-contracts";

/**
 * @param {{
 *   db: import("pg").Pool,
 *   event: unknown,
 * }} args
 */
export async function projectAccountOpenedV1({ db, event }) {
  if (!AccountOpenedV1EventCheck.Check(event)) {
    console.warn("Invalid account opened event ignored");
    return;
  }

  const { data } = event;

  await db.query(
    `
      INSERT INTO projected_accounts (
        account_id,
        version
      )
      VALUES ($1, $2)
      ON CONFLICT (account_id) DO UPDATE
      SET version = EXCLUDED.version
      WHERE projected_accounts.version <= EXCLUDED.version
    `,
    [data.account.id, data.version],
  );
}
