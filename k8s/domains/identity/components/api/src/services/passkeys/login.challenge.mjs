import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { randomBytes } from "node:crypto";
import { DatabaseError } from "pg";

/**
 * @typedef {import("@simplewebauthn/server").PublicKeyCredentialRequestOptionsJSON} PublicKeyCredentialRequestOptionsJSON
 */

/**
 * @param {{ db: import("pg").Pool, origin: string }} resources
 * @returns {() => Promise<PublicKeyCredentialRequestOptionsJSON>}
 */
export const createLoginChallenge =
  ({ db, origin }) =>
  async () => {
    try {
      const challenge = randomBytes(32);

      await db.query(
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
        (err instanceof Error &&
          "code" in err &&
          "syscall" in err &&
          typeof err.code === "string")
      ) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    }
  };
