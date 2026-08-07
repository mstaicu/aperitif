import { generateRegistrationOptions } from "@simplewebauthn/server";
import { randomBytes } from "node:crypto";

/**
 * @param {{ origin: string, pool: import("pg").Pool }} resources
 */
export const createRegisterChallenge =
  ({ origin, pool }) =>
  async () => {
    const challenge = randomBytes(32);

    const {
      rows: [registrationChallenge],
    } = await pool.query(
      `
        INSERT INTO registration_challenges (
          challenge,
          user_id
        )
        VALUES ($1, gen_random_uuid())
        RETURNING user_id
      `,
      [challenge],
    );

    const { hostname } = new URL(origin);
    const webauthnUserHandle = Buffer.from(
      registrationChallenge.user_id.replace(/-/g, ""),
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
      userDisplayName: registrationChallenge.user_id,
      userID: webauthnUserHandle,
      userName: registrationChallenge.user_id,
    });
  };
