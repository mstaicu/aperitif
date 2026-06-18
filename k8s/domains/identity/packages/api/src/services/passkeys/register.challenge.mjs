import { generateRegistrationOptions } from "@simplewebauthn/server";
import { randomBytes } from "node:crypto";
import { DatabaseError } from "pg";

/**
 * @typedef {import("@simplewebauthn/server").PublicKeyCredentialCreationOptionsJSON} PublicKeyCredentialCreationOptionsJSON
 */

/**
 * @param {{ db: import("pg").Pool, origin: string }} resources
 * @returns {() => Promise<PublicKeyCredentialCreationOptionsJSON>}
 */
export const createRegisterChallenge =
  ({ db, origin }) =>
  async () => {
    try {
      const challenge = randomBytes(32);

      const {
        rows: [registrationChallenge],
      } = await db.query(
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

/**
 * @param {{ db: import("pg").Pool, origin: string }} resources
 * @returns {(args: {userId: string}) => Promise<PublicKeyCredentialCreationOptionsJSON>}
 */
export const createPasskeyChallenge =
  ({ db, origin }) =>
  async ({ userId }) => {
    try {
      const {
        rows: [user],
      } = await db.query(
        `
          SELECT id
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
      } = await db.query(
        `
          INSERT INTO registration_challenges (
            challenge,
            user_id
          )
          VALUES ($1, $2)
          RETURNING user_id
        `,
        [challenge, user.id],
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
