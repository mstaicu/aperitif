import {
  buildSessionEstablishedV1,
  SessionEstablishedV1Subject,
} from "@mstaicu/identity-contracts";
import { context, propagation } from "@opentelemetry/api";
import { createHash, randomBytes } from "node:crypto";

/**
 * Uses the caller's active transaction. The principal must be newly inserted
 * or locked by the caller until commit, serializing session issuance with
 * credential removal before capturing the mutation clock.
 * @param {{ client: import("pg").PoolClient }} resources
 * @param {{ principalId: string }} args
 */
export async function createSession({ client }, { principalId }) {
  const sessionToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(sessionToken).digest();

  const {
    rows: [session],
  } = await client.query(
    `
      WITH mutation AS MATERIALIZED (
        SELECT clock_timestamp() AS occurred_at
      )
      INSERT INTO sessions (principal_id, token_hash, created_at, expires_at)
      SELECT $1, $2, occurred_at, occurred_at + INTERVAL '30 days'
      FROM mutation
      RETURNING id, created_at, expires_at,
        EXTRACT(EPOCH FROM (expires_at - clock_timestamp()))::int AS expires_in
    `,
    [principalId, tokenHash],
  );

  const event = buildSessionEstablishedV1({
    data: {
      expires_at: session.expires_at.toISOString(),
      principal_id: principalId,
      session_id: session.id,
    },
    time: session.created_at.toISOString(),
  });

  const headers = { "Content-Type": "application/cloudevents+json" };
  propagation.inject(context.active(), headers);

  await client.query(
    `
      INSERT INTO outbox_messages (id, subject, payload, headers)
      VALUES ($1, $2, $3::jsonb, $4::jsonb)
    `,
    [event.id, SessionEstablishedV1Subject, event, headers],
  );

  return {
    expires_in: session.expires_in,
    session_token: sessionToken,
  };
}
