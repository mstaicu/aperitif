import { AccountOpenedV1EventCheck } from "@mstaicu/accounts-contracts";

/**
 * @param {{
 *   db: import("pg").Pool,
 *   event: unknown,
 * }} args
 */
export async function projectAccountOpenedV1({ db, event }) {
  if (!AccountOpenedV1EventCheck.Check(event)) {
    console.warn(
      JSON.stringify({
        event: "invalid_account_opened_event_ignored",
        level: "warn",
        service: "entitlements-accounts-projector",
      }),
    );
    return;
  }

  const { data } = /** @type {{
    data: {
      account: { id: string, type: "personal" | "business" },
      version: number,
    },
  }} */ (event);

  const result = await db.query(
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

  if ((result.rowCount ?? 0) > 0) {
    console.log(
      JSON.stringify({
        account_id: data.account.id,
        event: "account_projection_updated",
        level: "info",
        service: "entitlements-accounts-projector",
        version: data.version,
      }),
    );
  }
}
