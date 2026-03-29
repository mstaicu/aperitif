import { refresh } from "./refresh.mjs";
import { createAccessToken } from "./token.mjs";

/**
 * @param {import("../../context.mjs").Context} ctx
 */
export const createSessionsRuntime = (ctx) => ({
  createAccessToken: createAccessToken(ctx),
  refresh: refresh(ctx),
});
