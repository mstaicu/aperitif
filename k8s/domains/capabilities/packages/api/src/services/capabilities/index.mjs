import { listCapabilities } from "./capabilities.list.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createCapabilitiesService = (ctx) => ({
  listCapabilities: listCapabilities(ctx),
});

/**
 * @typedef {ReturnType<typeof createCapabilitiesService>} CapabilitiesService
 */
