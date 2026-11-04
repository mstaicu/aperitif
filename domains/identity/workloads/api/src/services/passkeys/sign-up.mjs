import {
  buildPrincipalRegisteredV1,
  PrincipalRegisteredV1Subject,
} from "@mstaicu/identity-contracts";
import { context, propagation } from "@opentelemetry/api";
import createError from "http-errors";

import { createSession } from "../sessions/create.mjs";
import {
  consumeRegistrationChallenge,
  storePasskey,
  verifyRegistration,
} from "./registration.mjs";

/**
 * Creates a principal, its first passkey and a session atomically.
 * @param {{ pool: import("pg").Pool, origin: string }} resources
 * @param {{ credential: import("@simplewebauthn/server").RegistrationResponseJSON, name?: string }} args
 */
export async function signUpWithPasskey(
  { origin, pool },
  { credential, name },
) {
  const client = await pool.connect();

  try {
    const registrationChallenge = await consumeRegistrationChallenge(
      { client },
      credential,
    );

    await client.query("BEGIN");

    const verifiedCredential = await verifyRegistration(
      { origin },
      credential,
      registrationChallenge.challenge,
    );

    const {
      rows: [principal],
    } = await client.query(
      `
        INSERT INTO principals (id)
        VALUES ($1)
        ON CONFLICT DO NOTHING
        RETURNING id, created_at
      `,
      [registrationChallenge.principal_id],
    );

    if (!principal) throw new createError.UnprocessableEntity();

    const event = buildPrincipalRegisteredV1({
      data: { principal_id: principal.id },
      time: principal.created_at.toISOString(),
    });
    const headers = { "Content-Type": "application/cloudevents+json" };
    propagation.inject(context.active(), headers);

    await client.query(
      `
        INSERT INTO outbox_messages (id, subject, payload, headers)
        VALUES ($1, $2, $3::jsonb, $4::jsonb)
      `,
      [event.id, PrincipalRegisteredV1Subject, event, headers],
    );

    await storePasskey(
      { client },
      { credential: verifiedCredential, name, principalId: principal.id },
    );
    const session = await createSession({ client, principalId: principal.id });

    await client.query("COMMIT");

    return session;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
