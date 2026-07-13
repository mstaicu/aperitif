import { createAccessToken } from "./access-token.create.mjs";
import { rotateRefreshToken } from "./refresh-token.rotate.mjs";
import { revokeSession } from "./session.revoke.mjs";

/**
 * @param {{
 *   db: import("pg").Pool,
 *   signingKey: import("../../platform/security/index.mjs").JwtKeys["signingKey"],
 * }} resources
 */
export const createSessionsService = ({ db, signingKey }) => ({
  createAccessToken: createAccessToken({ db, signingKey }),
  revokeSession: revokeSession({ db }),
  rotateRefreshToken: rotateRefreshToken({ db }),
});

/**
 * @typedef {ReturnType<typeof createSessionsService>} SessionsService
 */
