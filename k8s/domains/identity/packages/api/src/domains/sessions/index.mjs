import { createAccessToken } from "./access-token.mjs";
import { rotateRefreshToken } from "./refresh-token.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createSessionsDomain = (ctx) => ({
  createAccessToken: createAccessToken(ctx),
  rotateRefreshToken: rotateRefreshToken(ctx),
});

/**
 * @typedef {ReturnType<typeof createSessionsDomain>} SessionsDomain
 */
