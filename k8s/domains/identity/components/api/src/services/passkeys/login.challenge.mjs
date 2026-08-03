import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { randomBytes } from "node:crypto";
import { DatabaseError } from "pg";

import { createError } from "../../platform/problem-details.mjs";

/**
 * @typedef {import("@simplewebauthn/server").PublicKeyCredentialRequestOptionsJSON} PublicKeyCredentialRequestOptionsJSON
 */

/**
 * @param {{ origin: string, pool: import("pg").Pool }} resources
 * @returns {() => Promise<PublicKeyCredentialRequestOptionsJSON>}
 */
export const createLoginChallenge =
  ({ origin, pool }) =>
  async () => {
    try {
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
