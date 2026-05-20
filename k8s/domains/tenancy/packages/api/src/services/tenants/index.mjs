import { createTenantWorkspace } from "./tenant.workspace.create.mjs";
import { createTenant } from "./tenants.create.mjs";
import { listTenants } from "./tenants.list.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createTenancyService = (ctx) => ({
  createTenant: createTenant(ctx),
  createTenantWorkspace: createTenantWorkspace(ctx),
  listTenants: listTenants(ctx),
});

/**
 * @typedef {ReturnType<typeof createTenancyService>} TenancyService
 */
