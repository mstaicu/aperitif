import { getAccount } from "./account.get.mjs";
import { deleteAccountMembership } from "./account.membership.delete.mjs";
import { getAccountMembership } from "./account.membership.get.mjs";
import { listAccountMemberships } from "./account.memberships.list.mjs";
import { listAccountRequirements } from "./account.requirements.list.mjs";
import { createAccount } from "./accounts.create.mjs";
import { listAccounts } from "./accounts.list.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createTenancyDomain = (ctx) => ({
  createAccount: createAccount(ctx),
  deleteAccountMembership: deleteAccountMembership(ctx),
  getAccount: getAccount(ctx),
  getAccountMembership: getAccountMembership(ctx),
  listAccountMemberships: listAccountMemberships(ctx),
  listAccountRequirements: listAccountRequirements(ctx),
  listAccounts: listAccounts(ctx),
});

/**
 * @typedef {ReturnType<typeof createTenancyDomain>} TenancyDomain
 */
