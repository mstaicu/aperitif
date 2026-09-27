import {
  buildAccountSnapshotV1,
  buildAccountV1Subject,
} from "@mstaicu/accounts-contracts";
import { context, propagation } from "@opentelemetry/api";

/**
 * @param {{ pool: import("pg").Pool }} resources
 * @param {{ currentSubjectId: string, name: string }} args
 */
export const createAccount = async ({ pool }, { currentSubjectId, name }) => {
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

    await client.query(
      `
          INSERT INTO account_memberships (
            account_id,
            subject_id,
            role
          )
          VALUES ($1, $2, 'owner')
        `,
      [account.id, currentSubjectId],
    );

    const createdAt = account.created_at.toISOString();
    const accountSnapshotEvent = buildAccountSnapshotV1({
      created_at: createdAt,
      id: account.id,
      name: account.name,
      version: Number(account.version),
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

    await client.query("COMMIT");

    return {
      account: {
        created_at: createdAt,
        id: account.id,
        name: account.name,
        role: "owner",
      },
    };
  } catch (err) {
    await client?.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client?.release();
  }
};
