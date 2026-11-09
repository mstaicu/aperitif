import { generateRegistrationOptions } from "@simplewebauthn/server";
import { randomUUID } from "node:crypto";

/** @param {{ origin: string, pool: import("pg").Pool }} resources */
export async function createPasskeyRegistrationOptions({ origin, pool }) {
  const principalId = randomUUID();
  const { hostname } = new URL(origin);
  const options = await generateRegistrationOptions({
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
    rpID: hostname,
    rpName: hostname,
    userDisplayName: principalId,
    userID: Buffer.from(principalId),
    userName: principalId,
  });

  await pool.query(
    `
      INSERT INTO passkey_registration_challenges (
        challenge,
        principal_id
      )
      VALUES ($1, $2)
    `,
    [options.challenge, principalId],
  );

  return options;
}
