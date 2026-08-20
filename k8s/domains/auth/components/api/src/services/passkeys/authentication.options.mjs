import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { randomBytes } from "node:crypto";

/**
 * @param {{ origin: string, pool: import("pg").Pool }} resources
 */
export const createAuthenticationOptions =
  ({ origin, pool }) =>
  async () => {
    const challenge = randomBytes(32);

    await pool.query(
      `
        INSERT INTO authentication_challenges (challenge)
        VALUES ($1)
      `,
      [challenge],
    );

    return generateAuthenticationOptions({
      challenge,
      rpID: new URL(origin).hostname,
      userVerification: "required",
    });
  };
