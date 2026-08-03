import { set } from "./grants.set.mjs";

/**
 * @param {{ pool: import("pg").Pool }} resources
 */
export const getGrantsService = ({ pool }) => ({
  set: set({ pool }),
});

/**
 * @typedef {ReturnType<typeof getGrantsService>} GrantsService
 */
