import { generateRegistrationOptions } from "@simplewebauthn/server";
import { randomBytes } from "node:crypto";
import { DatabaseError } from "pg";

import { createError } from "../../platform/problem-details.mjs";

/**
 * @typedef {import("@simplewebauthn/server").PublicKeyCredentialCreationOptionsJSON} PublicKeyCredentialCreationOptionsJSON
 */

/**
 * @param {{ origin: string, pool: import("pg").Pool }} resources
 * @returns {() => Promise<PublicKeyCredentialCreationOptionsJSON>}
 */
export const createRegisterChallenge =
  ({ origin, pool }) =>
  async () => {
    try {
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
    } catch (err) {
      if (
        (err instanceof DatabaseError &&
          (err.code?.startsWith("08") ||
            err.code === "57P01" ||
            err.code === "57P03" ||
            err.code === "53300")) ||
        (Error.isError(err) &&
          "code" in err &&
          "syscall" in err &&
          typeof err.code === "string")
      ) {
        throw createError("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    }
  };
