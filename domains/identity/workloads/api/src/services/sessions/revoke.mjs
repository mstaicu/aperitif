import {
  buildSessionRevokedV1,
  SessionRevokedV1Subject,
} from "@mstaicu/identity-contracts";
import { context, propagation } from "@opentelemetry/api";
import createError from "http-errors";
import { createHash } from "node:crypto";

/**
 * @param {{ pool: import("pg").Pool }} resources
 * @param {{ session_token: string }} args
 */
export const revokeSession = async ({ pool }, { session_token }) => {
  if (!session_token || typeof session_token !== "string")
    throw new createError.Unauthorized();
  const tokenHash = createHash("sha256").update(session_token).digest();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const {
      rows: [session],
    } = await client.query(
      `
        WITH locked AS MATERIALIZED (
          SELECT id FROM sessions WHERE token_hash = $1 FOR UPDATE
        ), mutation AS MATERIALIZED (
          SELECT id, clock_timestamp() AS occurred_at FROM locked
        )
        DELETE FROM sessions USING mutation
        WHERE sessions.id = mutation.id
          AND sessions.expires_at > mutation.occurred_at
        RETURNING sessions.id, sessions.principal_id, mutation.occurred_at
      `,
      [tokenHash],
    );
    if (!session) throw new createError.Unauthorized();
    const event = buildSessionRevokedV1({
      data: {
        principal_id: session.principal_id,
        session_id: session.id,
      },
      time: session.occurred_at.toISOString(),
    });
    const headers = { "Content-Type": "application/cloudevents+json" };
    propagation.inject(context.active(), headers);
    await client.query(
      `
        INSERT INTO outbox_messages (id, subject, payload, headers)
        VALUES ($1, $2, $3::jsonb, $4::jsonb)
      `,
      [event.id, SessionRevokedV1Subject, event, headers],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};
