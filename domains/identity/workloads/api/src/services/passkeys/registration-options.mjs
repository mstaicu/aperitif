import { generateRegistrationOptions } from "@simplewebauthn/server";
import { randomBytes } from "node:crypto";

/**
 * @param {{ origin: string, pool: import("pg").Pool }} resources
 */
export const createRegistrationOptions = async ({ origin, pool }) => {
  const challenge = randomBytes(32);

  const {
    rows: [registrationChallenge],
  } = await pool.query(
    `
        INSERT INTO registration_challenges (
          challenge,
          principal_id
        )
        VALUES ($1, gen_random_uuid())
        RETURNING principal_id
      `,
    [challenge],
  );

  const { hostname } = new URL(origin);
  const webauthnUserHandle = Buffer.from(
    registrationChallenge.principal_id.replace(/-/g, ""),
    "hex",
  );

  return generateRegistrationOptions({
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
    challenge,
    rpID: hostname,
    rpName: hostname,
    timeout: 60000,
    userDisplayName: registrationChallenge.principal_id,
    userID: webauthnUserHandle,
    userName: registrationChallenge.principal_id,
  });
};
