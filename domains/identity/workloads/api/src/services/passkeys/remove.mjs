import {
  buildCredentialRemovedV1,
  buildSessionRevokedV1,
  CredentialRemovedV1Subject,
  SessionRevokedV1Subject,
} from "@mstaicu/identity-contracts";
import { context, propagation } from "@opentelemetry/api";
import createError from "http-errors";

/**
 * Requires the caller's active transaction and an already authorized, locked principal.
 * @param {{ client: import("pg").PoolClient }} resources
 * @param {{ id: string, principalId: string }} args
 */
export async function removePasskey({ client }, { id, principalId }) {
  const { rows: passkeys } = await client.query(
    `
      SELECT id
      FROM passkey_credentials
      WHERE principal_id = $1
    `,
    [principalId],
  );

  if (!passkeys.some((passkey) => passkey.id === id.toLowerCase())) {
    throw new createError.NotFound();
  }

  if (passkeys.length === 1) {
    throw new createError.Conflict(
      "The final authentication method cannot be removed",
    );
  }

  const {
    rows: [removed],
  } = await client.query(
    `
      DELETE FROM passkey_credentials
      WHERE id = $1
        AND principal_id = $2
      RETURNING id, clock_timestamp()::text AS occurred_at
    `,
    [id, principalId],
  );

  // Keep the database clock's full precision when selecting affected sessions.
  const { rows: sessions } = await client.query(
    `
    DELETE FROM sessions WHERE principal_id = $1
    RETURNING id, expires_at > $2::timestamptz AS active
  `,
    [principalId, removed.occurred_at],
  );

  const headers = {
    "Content-Type": "application/cloudevents+json",
  };
  propagation.inject(context.active(), headers);

  const time = new Date(removed.occurred_at).toISOString();
  const credentialRemovedEvent = buildCredentialRemovedV1({
    data: {
      credential_ref: removed.id,
      principal_id: principalId,
    },
    time,
  });
  await client.query(
    `
      INSERT INTO outbox_messages (id, subject, payload, headers)
      VALUES ($1, $2, $3::jsonb, $4::jsonb)
    `,
    [
      credentialRemovedEvent.id,
      CredentialRemovedV1Subject,
      credentialRemovedEvent,
      headers,
    ],
  );
  for (const session of sessions.filter((session) => session.active)) {
    const sessionRevokedEvent = buildSessionRevokedV1({
      data: {
        principal_id: principalId,
        session_id: session.id,
      },
      time,
    });
    await client.query(
      `
        INSERT INTO outbox_messages (id, subject, payload, headers)
        VALUES ($1, $2, $3::jsonb, $4::jsonb)
      `,
      [
        sessionRevokedEvent.id,
        SessionRevokedV1Subject,
        sessionRevokedEvent,
        headers,
      ],
    );
  }
}
