import { listCapabilities } from "./capabilities.list.mjs";

/**
 * @param {import("../../platform/runtime.mjs").Runtime} runtime
 */
export const createCapabilitiesService = (runtime) => ({
  listCapabilities: listCapabilities(runtime),
});

/**
 * @typedef {ReturnType<typeof createCapabilitiesService>} CapabilitiesService
 */
