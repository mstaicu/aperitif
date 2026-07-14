import { AccountEntitlementsUpdatedV1EventCheck } from "@mstaicu/entitlements-contracts";

/**
 * @param {{
 *   db: import("pg").Pool,
 *   event: unknown,
 * }} args
 */
export async function projectAccountEntitlementsUpdatedV1({ db, event }) {
  if (!AccountEntitlementsUpdatedV1EventCheck.Check(event)) {
    console.warn("Invalid account entitlements event ignored");
    return;
  }

  const { data } = event;
  const entitlements = Object.fromEntries(
    data.entitlements.map((entitlement) => [entitlement.id, entitlement.value]),
  );

  await db.query(
    `
      INSERT INTO projected_account_entitlements (
        account_id,
        entitlements,
        version
      )
      VALUES ($1, $2::jsonb, $3)
      ON CONFLICT (account_id) DO UPDATE
      SET entitlements = EXCLUDED.entitlements,
        version = EXCLUDED.version
      WHERE projected_account_entitlements.version <= EXCLUDED.version
    `,
    [data.account.id, JSON.stringify(entitlements), data.version],
  );
}
