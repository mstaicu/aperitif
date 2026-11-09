import {
  buildCredentialAddedV1,
  buildPrincipalRegisteredV1,
  CredentialAddedV1Subject,
  PrincipalRegisteredV1Subject,
} from "@mstaicu/identity-contracts";
import { context, propagation } from "@opentelemetry/api";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { decodeClientDataJSON } from "@simplewebauthn/server/helpers";
import createError from "http-errors";

import { createSession } from "../sessions/create.mjs";

/**
 * Creates a principal, its first passkey and a session atomically.
 * @param {{ pool: import("pg").Pool, origin: string }} resources
 * @param {{ registration: import("@simplewebauthn/server").RegistrationResponseJSON, name?: string }} args
 */
export async function completePasskeyRegistration(
  { origin, pool },
  { name = "Passkey", registration },
) {
  let challenge;

  try {
    ({ challenge } = decodeClientDataJSON(
      registration.response.clientDataJSON,
    ));
  } catch {
    throw new createError.BadRequest();
  }

  // Consume before the transaction so a failed registration cannot restore its proof.
  const {
    rows: [registrationChallenge],
  } = await pool.query(
    `
      DELETE FROM passkey_registration_challenges
      WHERE challenge = $1
        AND expires_at > NOW()
      RETURNING principal_id
    `,
    [challenge],
  );

  if (!registrationChallenge) {
    throw new createError.UnprocessableEntity();
  }

  const { hostname, origin: expectedOrigin } = new URL(origin);

  const verification = await verifyRegistrationResponse({
    expectedChallenge: challenge,
    expectedOrigin,
    expectedRPID: hostname,
    response: registration,
  }).catch(() => {
    throw new createError.UnprocessableEntity();
  });

  if (!verification.verified) {
    throw new createError.UnprocessableEntity();
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      rows: [principal],
    } = await client.query(
      `
        INSERT INTO principals (id)
        VALUES ($1)
        RETURNING id, created_at
      `,
      [registrationChallenge.principal_id],
    );

    const verifiedCredential = verification.registrationInfo.credential;

    const {
      rows: [passkey],
    } = await client.query(
      `
        INSERT INTO passkey_credentials (principal_id, credential_id, name, public_key, sign_count)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (credential_id) DO NOTHING
        RETURNING id, created_at
      `,
      [
        principal.id,
        verifiedCredential.id,
        name,
        verifiedCredential.publicKey,
        verifiedCredential.counter,
      ],
    );

    if (!passkey) {
      throw new createError.UnprocessableEntity();
    }

    const principalRegisteredEvent = buildPrincipalRegisteredV1({
      data: { principal_id: principal.id },
      time: principal.created_at.toISOString(),
    });

    const credentialAddedEvent = buildCredentialAddedV1({
      data: { credential_id: passkey.id, principal_id: principal.id },
      time: passkey.created_at.toISOString(),
    });

    const headers = { "Content-Type": "application/cloudevents+json" };
    propagation.inject(context.active(), headers);

    await client.query(
      `
        INSERT INTO outbox_messages (id, subject, payload, headers)
        VALUES
          ($1, $2, $3::jsonb, $4::jsonb),
          ($5, $6, $7::jsonb, $4::jsonb)
      `,
      [
        principalRegisteredEvent.id,
        PrincipalRegisteredV1Subject,
        principalRegisteredEvent,
        headers,
        credentialAddedEvent.id,
        CredentialAddedV1Subject,
        credentialAddedEvent,
      ],
    );

    const session = await createSession(
      { client },
      { principalId: principal.id },
    );

    await client.query("COMMIT");

    return session;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
