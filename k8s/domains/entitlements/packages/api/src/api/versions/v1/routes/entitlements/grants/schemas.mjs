import { Type } from "@sinclair/typebox";

const AccountId = Type.String({
  description: "Stable identifier for a account resource.",
  format: "uuid",
});

const GrantId = Type.String({
  description: "Stable identifier for one current account entitlement grant.",
  format: "uuid",
});

const EntitlementId = Type.String({
  description: "Stable entitlement identifier.",
  minLength: 1,
});

const EntitlementValue = Type.Union([Type.Boolean(), Type.Number()], {
  description: "Entitlement value granted to the account.",
});

const EntitlementInput = Type.Object(
  {
    entitlement_id: EntitlementId,
    grant_id: GrantId,
    value: EntitlementValue,
  },
  {
    additionalProperties: false,
    description: "Entitlement grant value added to the account.",
  },
);

export const AddAccountEntitlementsBody = Type.Object(
  {
    account_id: AccountId,
    entitlements: Type.Array(EntitlementInput, {
      description: "Entitlement grant values added to this account.",
      minItems: 1,
    }),
  },
  {
    additionalProperties: false,
    description: "Payload for adding current account entitlement grants.",
  },
);

export const AddAccountEntitlementsResponse = Type.Object(
  {
    account_id: AccountId,
  },
  {
    additionalProperties: false,
    description: "Account whose entitlements were recomputed.",
  },
);

const EntitlementRevokeInput = Type.Object(
  {
    entitlement_id: EntitlementId,
    grant_id: GrantId,
  },
  {
    additionalProperties: false,
    description: "Entitlement grant removed from the account.",
  },
);

export const RevokeAccountEntitlementsBody = Type.Object(
  {
    account_id: AccountId,
    entitlements: Type.Array(EntitlementRevokeInput, {
      description: "Entitlement grant values removed from this account.",
      minItems: 1,
    }),
  },
  {
    additionalProperties: false,
    description: "Payload for revoking current account entitlement grants.",
  },
);

export const RevokeAccountEntitlementsResponse = Type.Object(
  {
    account_id: AccountId,
  },
  {
    additionalProperties: false,
    description: "Account whose entitlements were recomputed.",
  },
);
