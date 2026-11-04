import {
  buildCredentialAddedV1,
  CredentialAddedV1Subject,
} from "@mstaicu/identity-contracts";
import { context, propagation } from "@opentelemetry/api";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { decodeClientDataJSON } from "@simplewebauthn/server/helpers";
import createError from "http-errors";

/**
 * Deletes and returns the challenge. Call before BEGIN so failure cannot restore it.
 * @param {{ client: import("pg").PoolClient }} resources
 * @param {import("@simplewebauthn/server").RegistrationResponseJSON} credential
 */
export async function consumeRegistrationChallenge({ client }, credential) {
  let challenge;

  try {
    ({ challenge } = decodeClientDataJSON(credential.response.clientDataJSON));
  } catch {
    throw new createError.BadRequest();
  }

  if (typeof challenge !== "string") throw new createError.BadRequest();

  const {
    rows: [registrationChallenge],
  } = await client.query(
    `
      DELETE FROM passkey_registration_challenges
      WHERE challenge = $1
        AND expires_at > NOW()
      RETURNING principal_id, challenge
    `,
    [Buffer.from(challenge, "base64url")],
  );

  if (!registrationChallenge) throw new createError.UnprocessableEntity();

  return /** @type {{ principal_id: string, challenge: Buffer }} */ (
    registrationChallenge
  );
}

/**
 * Stores the verified credential and its fact in the caller's active transaction.
 * The principal must be newly inserted or locked until commit.
 * @param {{ client: import("pg").PoolClient }} resources
 * @param {{ credential: Awaited<ReturnType<typeof verifyRegistration>>, principalId: string, name?: string }} args
 */
export async function storePasskey(
  { client },
  { credential, name = "Passkey", principalId },
) {
  const {
    rows: [passkey],
  } = await client.query(
    `
      INSERT INTO passkey_credentials (
        principal_id,
        credential_id,
        name,
        public_key,
        sign_count
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (credential_id) DO NOTHING
      RETURNING id, created_at
    `,
    [
      principalId,
      Buffer.from(credential.id, "base64url"),
      name,
      Buffer.from(credential.publicKey),
      credential.counter,
    ],
  );

  if (!passkey) throw new createError.UnprocessableEntity();

  const event = buildCredentialAddedV1({
    data: { credential_id: passkey.id, principal_id: principalId },
    time: passkey.created_at.toISOString(),
  });
  const headers = { "Content-Type": "application/cloudevents+json" };
  propagation.inject(context.active(), headers);

  await client.query(
    `
      INSERT INTO outbox_messages (id, subject, payload, headers)
      VALUES ($1, $2, $3::jsonb, $4::jsonb)
    `,
    [event.id, CredentialAddedV1Subject, event, headers],
  );
}

/**
 * Verifies new credential registration against the consumed registration challenge.
 * @param {{ origin: string }} resources
 * @param {import("@simplewebauthn/server").RegistrationResponseJSON} credential
 * @param {Buffer} challenge
 */
export async function verifyRegistration({ origin }, credential, challenge) {
  const { hostname, origin: expectedOrigin } = new URL(origin);
  let verification;

  try {
    verification = await verifyRegistrationResponse({
      expectedChallenge: challenge.toString("base64url"),
      expectedOrigin,
      expectedRPID: hostname,
      requireUserVerification: true,
      response: credential,
    });
  } catch {
    throw new createError.UnprocessableEntity();
  }

  if (!verification.verified) throw new createError.UnprocessableEntity();

  return verification.registrationInfo.credential;
}
