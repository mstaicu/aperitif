import { generateRegistrationOptions } from "@simplewebauthn/server";
import { randomBytes, randomUUID } from "node:crypto";
import { DatabaseError } from "pg";

/**
 * @typedef {import("@simplewebauthn/server").PublicKeyCredentialCreationOptionsJSON} PublicKeyCredentialCreationOptionsJSON
 */

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {() => Promise<PublicKeyCredentialCreationOptionsJSON>}
 */
export const createRegisterChallenge = (ctx) => async () => {
  try {
    const userId = randomUUID();
    const userLabel = `identity-${userId.slice(0, 8)}`;

    const webauthnUserHandle = Buffer.from(userId.replace(/-/g, ""), "hex");
    const challenge = randomBytes(32);

    await ctx.persistence.db.query(
      `
        INSERT INTO challenges (user_id, challenge)
        VALUES ($1, $2)
      `,
      [userId, challenge],
    );

    const { hostname } = new URL(ctx.app.origin);

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
      userDisplayName: userLabel,
      userID: webauthnUserHandle,
      userName: userLabel,
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
