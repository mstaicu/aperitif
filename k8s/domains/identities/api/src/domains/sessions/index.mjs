import { refresh } from "./refresh.mjs";
import { createAccessToken } from "./token.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createSessionsDomain = (ctx) => ({
  createAccessToken: createAccessToken(ctx),
  refresh: refresh(ctx),
});

/**
 * @typedef {ReturnType<typeof createSessionsDomain>} SessionsDomain
 */
