import { listCapabilities } from "./capabilities.list.mjs";

/**
 * @param {{ db: import("pg").Pool }} resources
 */
export const createCapabilitiesService = ({ db }) => ({
  listCapabilities: listCapabilities({ db }),
});

/**
 * @typedef {ReturnType<typeof createCapabilitiesService>} CapabilitiesService
 */
