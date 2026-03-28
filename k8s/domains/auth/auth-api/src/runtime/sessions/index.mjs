import { refresh } from "./refresh.mjs";
import { createAccessToken } from "./token.mjs";

/**
 * @param {import("../../fastify.js").Ctx} ctx
 */
export const createSessionsRuntime = (ctx) => ({
  createAccessToken: createAccessToken(ctx),
  refresh: refresh(ctx),
});
