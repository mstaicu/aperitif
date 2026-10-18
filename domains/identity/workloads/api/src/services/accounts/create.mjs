import {
  buildAccountSnapshotV1,
  buildAccountV1Subject,
  buildMembershipSnapshotV1,
  buildMembershipV1Subject,
} from "@mstaicu/identity-contracts";
import { context, propagation } from "@opentelemetry/api";

/**
 * @param {{ pool: import("pg").Pool }} resources
 * @param {{ principalId: string, name: string }} args
 */
export const createAccount = async ({ pool }, { name, principalId }) => {
  let client;

  try {
    client = await pool.connect();

    await client.query("BEGIN");

    const {
      rows: [account],
    } = await client.query(
      `
        INSERT INTO accounts (name)
        VALUES ($1)
        RETURNING id, name, created_at, version
      `,
      [name],
    );

    const {
      rows: [membership],
    } = await client.query(
      `
        INSERT INTO account_memberships (
          account_id,
          principal_id
        )
        VALUES ($1, $2)
        RETURNING id, version
      `,
      [account.id, principalId],
    );

    await client.query(
      `
        INSERT INTO account_membership_roles (membership_id, role)
        VALUES ($1, 'account.owner')
      `,
      [membership.id],
    );

    const createdAt = account.created_at.toISOString();
    const accountSnapshotEvent = buildAccountSnapshotV1({
      id: account.id,
      name: account.name,
      version: Number(account.version),
    });
    const membershipSnapshotEvent = buildMembershipSnapshotV1({
      account_id: account.id,
      id: membership.id,
      principal_id: principalId,
      roles: ["account.owner"],
      version: Number(membership.version),
    });
    const headers = {
      "Content-Type": "application/cloudevents+json",
    };

    propagation.inject(context.active(), headers);

    await client.query(
      `
        INSERT INTO outbox_messages (
          id,
          subject,
          payload,
          headers
        )
        VALUES ($1, $2, $3::jsonb, $4::jsonb)
      `,
      [
        accountSnapshotEvent.id,
        buildAccountV1Subject(account.id),
        accountSnapshotEvent,
        headers,
      ],
    );

    await client.query(
      `
        INSERT INTO outbox_messages (
          id,
          subject,
          payload,
          headers
        )
        VALUES ($1, $2, $3::jsonb, $4::jsonb)
      `,
      [
        membershipSnapshotEvent.id,
        buildMembershipV1Subject(membership.id),
        membershipSnapshotEvent,
        headers,
      ],
    );

    await client.query("COMMIT");

    return {
      account: {
        created_at: createdAt,
        id: account.id,
        name: account.name,
        roles: ["account.owner"],
      },
    };
  } catch (err) {
    await client?.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client?.release();
  }
};
