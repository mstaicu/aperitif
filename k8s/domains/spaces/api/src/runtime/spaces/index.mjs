import { destroy } from "./space.delete.mjs";
import { get } from "./space.get.mjs";
import { deleteMember } from "./space.member.delete.mjs";
import { createMember } from "./space.members.create.mjs";
import { listMembers } from "./space.members.list.mjs";
import { create } from "./spaces.create.mjs";
import { list } from "./spaces.list.mjs";

/**
 * @param {import("../../context.mjs").Context} ctx
 */
export const createSpacesRuntime = (ctx) => ({
  create: create(ctx),
  createMember: createMember(ctx),
  delete: destroy(ctx),
  deleteMember: deleteMember(ctx),
  get: get(ctx),
  list: list(ctx),
  listMembers: listMembers(ctx),
});

/**
 * @typedef {ReturnType<typeof createSpacesRuntime>} SpacesRuntime
 */
