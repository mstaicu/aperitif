import { generateRegistrationOptions } from "@simplewebauthn/server";
import { randomBytes, randomUUID } from "node:crypto";

/** @param {{ origin: string, pool: import("pg").Pool }} resources */
export async function createRegistrationOptions({ origin, pool }) {
  const challenge = randomBytes(32);
  const principalId = randomUUID();

  await pool.query(
    `
      INSERT INTO passkey_registration_challenges (challenge, principal_id)
      VALUES ($1, $2)
    `,
    [challenge, principalId],
  );

  const { hostname } = new URL(origin);

  return generateRegistrationOptions({
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
    challenge,
    rpID: hostname,
    rpName: hostname,
    userDisplayName: principalId,
    userID: Buffer.from(principalId.replace(/-/g, ""), "hex"),
    userName: principalId,
  });
}
