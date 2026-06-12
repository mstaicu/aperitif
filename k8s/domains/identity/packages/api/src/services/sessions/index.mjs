import { createAccessToken } from "./access-token.mjs";
import { rotateRefreshToken } from "./refresh-token.mjs";
import { revokeSession } from "./session.mjs";

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
