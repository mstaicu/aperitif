import { addTenantMember } from "./tenant-member.add.mjs";
import { removeTenantMember } from "./tenant-member.remove.mjs";
import { createTenant } from "./tenants.create.mjs";
import { listTenants } from "./tenants.list.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createTenancyService = (ctx) => ({
  addTenantMember: addTenantMember(ctx),
  createTenant: createTenant(ctx),
  listTenants: listTenants(ctx),
  removeTenantMember: removeTenantMember(ctx),
});

/**
 * @typedef {ReturnType<typeof createTenancyService>} TenancyService
 */
