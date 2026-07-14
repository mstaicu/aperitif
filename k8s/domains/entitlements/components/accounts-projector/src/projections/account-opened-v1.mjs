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
        type,
        version
      )
      VALUES ($1, $2, $3)
      ON CONFLICT (account_id) DO UPDATE
      SET type = EXCLUDED.type,
        version = EXCLUDED.version
      WHERE projected_accounts.version <= EXCLUDED.version
    `,
    [data.account.id, data.account.type, data.version],
  );
}
