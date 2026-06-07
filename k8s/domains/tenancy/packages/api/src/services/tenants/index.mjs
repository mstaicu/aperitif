import { createTenant } from "./tenants.create.mjs";
import { listTenants } from "./tenants.list.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createTenancyService = (ctx) => ({
  createTenant: createTenant(ctx),
  listTenants: listTenants(ctx),
});

/**
 * @typedef {ReturnType<typeof createTenancyService>} TenancyService
 */
