import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { randomBytes } from "node:crypto";
import { DatabaseError } from "pg";

/**
 * @typedef {import("@simplewebauthn/server").PublicKeyCredentialRequestOptionsJSON} PublicKeyCredentialRequestOptionsJSON
 */

/**
 * @param {import("../../platform/runtime.mjs").Runtime} runtime
 * @returns {() => Promise<PublicKeyCredentialRequestOptionsJSON>}
 */
export const createLoginChallenge = (runtime) => async () => {
  try {
    const challenge = randomBytes(32);

    await runtime.db.query(
      `
        INSERT INTO authentication_challenges (challenge)
        VALUES ($1)
      `,
      [challenge],
    );

    return generateAuthenticationOptions({
      challenge,
      rpID: new URL(runtime.app.origin).hostname,
      userVerification: "required",
    });
  } catch (err) {
    if (err instanceof DatabaseError) {
      if (
        err.code?.startsWith("08") ||
        err.code === "53300" ||
        err.code === "57P01" ||
        err.code === "57P02" ||
        err.code === "57P03" ||
        err.code === "57014"
      ) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }
    }

    throw err;
  }
};
