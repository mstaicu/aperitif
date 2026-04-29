import { getAccount } from "./account.get.mjs";
import { deleteAccountMembership } from "./account.membership.delete.mjs";
import { createAccountMembership } from "./account.memberships.create.mjs";
import { listAccountMemberships } from "./account.memberships.list.mjs";
import { completeAccountRequirement } from "./account.requirement.complete.mjs";
import { listAccountRequirements } from "./account.requirements.list.mjs";
import { createAccount } from "./accounts.create.mjs";
import { listAccounts } from "./accounts.list.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createAccountsDomain = (ctx) => ({
  completeAccountRequirement: completeAccountRequirement(ctx),
  createAccount: createAccount(ctx),
  createAccountMembership: createAccountMembership(ctx),
  deleteAccountMembership: deleteAccountMembership(ctx),
  getAccount: getAccount(ctx),
  listAccountMemberships: listAccountMemberships(ctx),
  listAccountRequirements: listAccountRequirements(ctx),
  listAccounts: listAccounts(ctx),
});

/**
 * @typedef {ReturnType<typeof createAccountsDomain>} AccountsDomain
 */
