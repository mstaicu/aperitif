import { listEntitlements } from "./entitlements.list.mjs";

/**
 * @param {{ db: import("pg").Pool }} resources
 */
export const createEntitlementsService = ({ db }) => ({
  listEntitlements: listEntitlements({ db }),
});

/**
 * @typedef {ReturnType<typeof createEntitlementsService>} EntitlementsService
 */
