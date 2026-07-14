import { AccountEntitlementsUpdatedV1EventCheck } from "@mstaicu/entitlements-contracts";

/**
 * @param {{
 *   db: import("pg").Pool,
 *   event: unknown,
 * }} args
 */
export async function projectAccountEntitlementsUpdatedV1({ db, event }) {
  if (!AccountEntitlementsUpdatedV1EventCheck.Check(event)) {
    console.warn(
      JSON.stringify({
        event: "invalid_account_entitlements_updated_event_ignored",
        level: "warn",
        service: "documents-entitlements-projector",
      }),
    );
    return;
  }

  const { data } = /** @type {{
    data: {
      account: { id: string },
      entitlements: Array<{ id: string, value: boolean | number }>,
      version: number,
    },
  }} */ (event);
  const entitlements = Object.fromEntries(
    data.entitlements.map((entitlement) => [entitlement.id, entitlement.value]),
  );

  const { rowCount } = await db.query(
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

  if (rowCount && rowCount > 0) {
    console.log(
      JSON.stringify({
        account_id: data.account.id,
        entitlement_count: data.entitlements.length,
        event: "account_entitlements_projection_updated",
        level: "info",
        service: "documents-entitlements-projector",
        version: data.version,
      }),
    );
  }
}
