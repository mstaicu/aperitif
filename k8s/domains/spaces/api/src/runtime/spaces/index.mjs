import { create } from "./spaces.create.mjs";
import { createMember } from "./space.members.create.mjs";
import { deleteMember } from "./space.member.delete.mjs";
import { get } from "./space.get.mjs";
import { leave } from "./space.leave.mjs";
import { list } from "./spaces.list.mjs";
import { listMembers } from "./space.members.list.mjs";

/**
 * @param {import("../../context.mjs").Context} ctx
 */
export const createSpacesRuntime = (ctx) => ({
  create: create(ctx),
  createMember: createMember(ctx),
  deleteMember: deleteMember(ctx),
  get: get(ctx),
  leave: leave(ctx),
  list: list(ctx),
  listMembers: listMembers(ctx),
});

/**
 * @typedef {ReturnType<typeof createSpacesRuntime>} SpacesRuntime
 */
