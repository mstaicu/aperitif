import { assignTenantMemberRole } from "./tenant-member-role.assign.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createTenantRolesService = (ctx) => ({
  assignTenantMemberRole: assignTenantMemberRole(ctx),
});

/**
 * @typedef {ReturnType<typeof createTenantRolesService>} TenantRolesService
 */
