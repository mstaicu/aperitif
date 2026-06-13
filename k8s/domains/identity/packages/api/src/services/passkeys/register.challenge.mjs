import { generateRegistrationOptions } from "@simplewebauthn/server";
import { randomBytes } from "node:crypto";
import { DatabaseError } from "pg";

/**
 * @typedef {import("@simplewebauthn/server").PublicKeyCredentialCreationOptionsJSON} PublicKeyCredentialCreationOptionsJSON
 */

/**
 * @param {import("../../platform/runtime.mjs").Runtime} runtime
 * @returns {(args: {email: string}) => Promise<PublicKeyCredentialCreationOptionsJSON>}
 */
export const createRegisterChallenge =
  (runtime) =>
  async ({ email }) => {
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      throw new Error("EMAIL_REQUIRED");
    }

    try {
      const {
        rows: [existingUser],
      } = await runtime.db.query(
        `
          SELECT 1
          FROM users
          WHERE email = $1
          LIMIT 1
        `,
        [normalizedEmail],
      );

      if (existingUser) {
        throw new Error("USER_ALREADY_REGISTERED");
      }

      const challenge = randomBytes(32);

      const {
        rows: [registrationChallenge],
      } = await runtime.db.query(
        `
          INSERT INTO registration_challenges (
            email,
            challenge,
            user_id
          )
          VALUES ($1, $2, gen_random_uuid())
          ON CONFLICT (email)
          DO UPDATE SET
            challenge = EXCLUDED.challenge,
            expires_at = NOW() + INTERVAL '2 minutes',
            user_id = gen_random_uuid()
          RETURNING user_id, email
        `,
        [normalizedEmail, challenge],
      );

      const { hostname } = new URL(runtime.app.origin);
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
        userDisplayName: registrationChallenge.email,
        userID: webauthnUserHandle,
        userName: registrationChallenge.email,
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

/**
 * @param {import("../../platform/runtime.mjs").Runtime} runtime
 * @returns {(args: {userId: string}) => Promise<PublicKeyCredentialCreationOptionsJSON>}
 */
export const createPasskeyChallenge =
  (runtime) =>
  async ({ userId }) => {
    try {
      const {
        rows: [user],
      } = await runtime.db.query(
        `
          SELECT id, email
          FROM users
          WHERE id = $1
        `,
        [userId],
      );

      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }

      const challenge = randomBytes(32);

      const {
        rows: [registrationChallenge],
      } = await runtime.db.query(
        `
          INSERT INTO registration_challenges (
            email,
            challenge,
            user_id
          )
          VALUES ($1, $2, $3)
          ON CONFLICT (email)
          DO UPDATE SET
            challenge = EXCLUDED.challenge,
            expires_at = NOW() + INTERVAL '2 minutes',
            user_id = EXCLUDED.user_id
          RETURNING user_id, email
        `,
        [user.email, challenge, user.id],
      );

      const { hostname } = new URL(runtime.app.origin);
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
        userDisplayName: registrationChallenge.email,
        userID: webauthnUserHandle,
        userName: registrationChallenge.email,
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
