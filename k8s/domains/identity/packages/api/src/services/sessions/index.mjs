import { createAccessToken } from "./access-token.create.mjs";
import { rotateRefreshToken } from "./refresh-token.rotate.mjs";
import { revokeSession } from "./session.revoke.mjs";

/**
 * @param {import("../../platform/runtime.mjs").Runtime} runtime
 */
export const createSessionsService = (runtime) => ({
  createAccessToken: createAccessToken(runtime),
  revokeSession: revokeSession(runtime),
  rotateRefreshToken: rotateRefreshToken(runtime),
});

/**
 * @typedef {ReturnType<typeof createSessionsService>} SessionsService
 */
