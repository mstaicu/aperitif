import { getAccount } from "./account.get.mjs";
import { deleteAccountMembership } from "./account.membership.delete.mjs";
import { createAccountMembership } from "./account.memberships.create.mjs";
import { listAccountMemberships } from "./account.memberships.list.mjs";
import { completeAccountRequirement } from "./account.requirement.complete.mjs";
import { listAccountRequirements } from "./account.requirements.list.mjs";
import { createAccountSpace } from "./account.spaces.create.mjs";
import { listAccountSpaces } from "./account.spaces.list.mjs";
import { createAccount } from "./accounts.create.mjs";
import { listAccounts } from "./accounts.list.mjs";
import { claimAdmission } from "./admission.claim.mjs";
import { getAdmission } from "./admission.get.mjs";
import { completeAdmissionRequirement } from "./admission.requirement.complete.mjs";
import { createAdmission } from "./space.admissions.create.mjs";
import { listAdmissions } from "./space.admissions.list.mjs";
import { destroy } from "./space.delete.mjs";
import { get } from "./space.get.mjs";
import { deleteMembership } from "./space.membership.delete.mjs";
import { listMemberships } from "./space.memberships.list.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createSpacesDomain = (ctx) => ({
  claimAdmission: claimAdmission(ctx),
  completeAccountRequirement: completeAccountRequirement(ctx),
  completeAdmissionRequirement: completeAdmissionRequirement(ctx),
  createAccount: createAccount(ctx),
  createAccountMembership: createAccountMembership(ctx),
  createAccountSpace: createAccountSpace(ctx),
  createAdmission: createAdmission(ctx),
  delete: destroy(ctx),
  deleteAccountMembership: deleteAccountMembership(ctx),
  deleteMembership: deleteMembership(ctx),
  get: get(ctx),
  getAccount: getAccount(ctx),
  getAdmission: getAdmission(ctx),
  listAccountMemberships: listAccountMemberships(ctx),
  listAccountRequirements: listAccountRequirements(ctx),
  listAccounts: listAccounts(ctx),
  listAccountSpaces: listAccountSpaces(ctx),
  listAdmissions: listAdmissions(ctx),
  listMemberships: listMemberships(ctx),
});

/**
 * @typedef {ReturnType<typeof createSpacesDomain>} SpacesDomain
 */
