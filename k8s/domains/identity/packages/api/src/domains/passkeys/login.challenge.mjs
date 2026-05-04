import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { randomBytes } from "node:crypto";

import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @typedef {import("@simplewebauthn/server").PublicKeyCredentialRequestOptionsJSON} PublicKeyCredentialRequestOptionsJSON
 */

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {() => Promise<PublicKeyCredentialRequestOptionsJSON>}
 */
export const createLoginChallenge = (ctx) => async () => {
  try {
    const challenge = randomBytes(32);

    await ctx.persistence.db.query(
      `
        INSERT INTO challenges (user_id, challenge)
        VALUES (NULL, $1)
      `,
      [challenge],
    );

    return generateAuthenticationOptions({
      challenge,
      rpID: new URL(ctx.app.origin).hostname,
      userVerification: "required",
    });
  } catch (err) {
    if (isDatabaseUnavailable(err)) {
      throw new Error("DATABASE_UNAVAILABLE", { cause: err });
    }

    throw err;
  }
};
