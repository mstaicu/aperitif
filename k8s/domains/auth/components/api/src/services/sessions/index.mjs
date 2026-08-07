import { createAccessToken } from "./access-token.create.mjs";
import { revokeSession } from "./session.revoke.mjs";

/**
 * @param {{
 *   pool: import("pg").Pool,
 *   signingKey: import("../../platform/jwt-keys.mjs").JwtKeys["signingKey"],
 * }} resources
 */
export const createSessionsService = ({ pool, signingKey }) => ({
  createAccessToken: createAccessToken({ pool, signingKey }),
  revokeSession: revokeSession({ pool }),
});

/**
 * @typedef {ReturnType<typeof createSessionsService>} SessionsService
 */
