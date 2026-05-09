import { getTenant } from "./tenant.get.mjs";
import { deleteTenantMembership } from "./tenant.membership.delete.mjs";
import { getTenantMembership } from "./tenant.membership.get.mjs";
import { listTenantMemberships } from "./tenant.memberships.list.mjs";
import { listTenantWorkspaces } from "./tenant.workspaces.list.mjs";
import { createTenant } from "./tenants.create.mjs";
import { listTenants } from "./tenants.list.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createTenancyDomain = (ctx) => ({
  createTenant: createTenant(ctx),
  deleteTenantMembership: deleteTenantMembership(ctx),
  getTenant: getTenant(ctx),
  getTenantMembership: getTenantMembership(ctx),
  listTenantMemberships: listTenantMemberships(ctx),
  listTenants: listTenants(ctx),
  listTenantWorkspaces: listTenantWorkspaces(ctx),
});

/**
 * @typedef {ReturnType<typeof createTenancyDomain>} TenancyDomain
 */
