import { createAccessToken } from "./access-token.mjs";
import { rotateRefreshToken } from "./refresh-token.mjs";

/**
 * @param {import("../../platform/runtime.mjs").Runtime} runtime
 */
export const createSessionsService = (runtime) => ({
  createAccessToken: createAccessToken(runtime),
  rotateRefreshToken: rotateRefreshToken(runtime),
});

/**
 * @typedef {ReturnType<typeof createSessionsService>} SessionsService
 */
