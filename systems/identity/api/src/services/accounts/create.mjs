import {
  AccountCreatedV1Subject,
  AccountSnapshotV1Subject,
  buildAccountCreatedV1,
  buildAccountSnapshotV1,
  buildMembershipCreatedV1,
  buildMembershipSnapshotV1,
  MembershipCreatedV1Subject,
  MembershipSnapshotV1Subject,
} from "@mstaicu/identity-contracts";
import { context, propagation } from "@opentelemetry/api";

/**
 * @param {{ pool: import("pg").Pool }} resources
 * @param {{ principalId: string, name: string }} args
 */
export const createAccount = async ({ pool }, { name, principalId }) => {
  const client = await pool.connect();

  try {
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

    const {
      rows: [ownerRole],
    } = await client.query(
      `
        INSERT INTO account_membership_roles (
          membership_id,
          role_id
        )
        VALUES ($1, 'account.owner')
        RETURNING role_id
      `,
      [membership.id],
    );
    const roles = [ownerRole.role_id];

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
      roles,
      version: Number(membership.version),
    });
    const accountCreatedEvent = buildAccountCreatedV1({
      data: {
        account_id: account.id,
        principal_id: principalId,
      },
      time: account.created_at.toISOString(),
    });
    const membershipCreatedEvent = buildMembershipCreatedV1({
      data: {
        account_id: account.id,
        membership_id: membership.id,
        principal_id: principalId,
        roles,
      },
      time: membership.created_at.toISOString(),
    });

    const headers = {
      "Content-Type": "application/cloudevents+json",
    };

    propagation.inject(context.active(), headers);

    await client.query(
      `
        INSERT INTO outbox_messages (id, subject, payload, headers)
        VALUES
          ($1, $2, $3::jsonb, $4::jsonb),
          ($5, $6, $7::jsonb, $4::jsonb),
          ($8, $9, $10::jsonb, $4::jsonb),
          ($11, $12, $13::jsonb, $4::jsonb)
      `,
      [
        accountSnapshotEvent.id,
        AccountSnapshotV1Subject,
        accountSnapshotEvent,
        headers,
        membershipSnapshotEvent.id,
        MembershipSnapshotV1Subject,
        membershipSnapshotEvent,
        accountCreatedEvent.id,
        AccountCreatedV1Subject,
        accountCreatedEvent,
        membershipCreatedEvent.id,
        MembershipCreatedV1Subject,
        membershipCreatedEvent,
      ],
    );

    await client.query("COMMIT");

    return {
      created_at: account.created_at.toISOString(),
      id: account.id,
      name: account.name,
      roles,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};
