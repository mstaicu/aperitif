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
        RETURNING id, created_at, version
      `,
      [account.id, principalId],
    );

    await client.query(
      `
        INSERT INTO account_membership_roles (
          membership_id,
          role
        )
        VALUES ($1, 'account.owner')
      `,
      [membership.id],
    );

    const accountSnapshotEvent = buildAccountSnapshotV1({
      created_at: account.created_at.toISOString(),
      id: account.id,
      name: account.name,
      version: Number(account.version),
    });
    const membershipSnapshotEvent = buildMembershipSnapshotV1({
      account_id: account.id,
      created_at: membership.created_at.toISOString(),
      id: membership.id,
      principal_id: principalId,
      roles: ["account.owner"],
      version: Number(membership.version),
    });

    const accountSnapshotSubject = buildAccountV1Subject(account.id);
    const membershipSnapshotSubject = buildMembershipV1Subject(membership.id);
    const headers = {
      "Content-Type": "application/cloudevents+json",
    };

    propagation.inject(context.active(), headers);

    // Replace pending snapshots in the resource transaction, including on create
    // so producers can follow the same pattern when implementing updates.
    await client.query(
      `
        DELETE FROM outbox_messages
        WHERE subject IN ($1, $2)
      `,
      [accountSnapshotSubject, membershipSnapshotSubject],
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
        accountSnapshotEvent.id,
        accountSnapshotSubject,
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
        membershipSnapshotSubject,
        membershipSnapshotEvent,
        headers,
      ],
    );

    await client.query("COMMIT");

    return {
      account: {
        created_at: account.created_at.toISOString(),
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
