import { createAdmission } from "./space.admissions.create.mjs";
import { destroy } from "./space.delete.mjs";
import { get } from "./space.get.mjs";
import { deleteMembership } from "./space.membership.delete.mjs";
import { createMembership } from "./space.memberships.create.mjs";
import { listMemberships } from "./space.memberships.list.mjs";
import { create } from "./spaces.create.mjs";
import { list } from "./spaces.list.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createSpacesDomain = (ctx) => ({
  create: create(ctx),
  createAdmission: createAdmission(ctx),
  createMembership: createMembership(ctx),
  delete: destroy(ctx),
  deleteMembership: deleteMembership(ctx),
  get: get(ctx),
  list: list(ctx),
  listMemberships: listMemberships(ctx),
});

/**
 * @typedef {ReturnType<typeof createSpacesDomain>} SpacesDomain
 */
