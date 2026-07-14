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
        service: "documents-accounts-projector",
      }),
    );
    return;
  }

  const { data } = /** @type {{
    data: {
      account: { id: string, type: "personal" | "business" },
      member: { role: string, user_id: string },
      version: number,
    },
  }} */ (event);

  const result = await db.query(
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

  if ((result.rowCount ?? 0) > 0) {
    console.log(
      JSON.stringify({
        account_id: data.account.id,
        event: "account_member_projection_updated",
        level: "info",
        role: data.member.role,
        service: "documents-accounts-projector",
        user_id: data.member.user_id,
        version: data.version,
      }),
    );
  }
}
