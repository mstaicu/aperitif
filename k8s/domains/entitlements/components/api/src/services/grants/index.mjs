import { set } from "./grants.set.mjs";

/**
 * @param {{ db: import("pg").Pool }} resources
 */
export const getGrantsService = ({ db }) => ({
  set: set({ db }),
});

/**
 * @typedef {ReturnType<typeof getGrantsService>} GrantsService
 */
