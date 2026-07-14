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
      INSERT INTO projected_account_members (
        account_id,
        user_id,
        role,
        version
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (account_id, user_id) DO UPDATE
      SET role = EXCLUDED.role,
        version = EXCLUDED.version
      WHERE projected_account_members.version <= EXCLUDED.version
    `,
    [data.account.id, data.member.user_id, data.member.role, data.version],
  );
}
