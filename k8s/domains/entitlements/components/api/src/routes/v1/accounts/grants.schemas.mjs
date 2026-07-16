import { Type } from "@sinclair/typebox";

const AccountId = Type.String({
  description: "Stable account identifier.",
  format: "uuid",
});

const GrantId = Type.String({
  description: "Stable grant identifier.",
  format: "uuid",
});

const CapabilityId = Type.String({
  description: "Stable capability identifier.",
  minLength: 1,
});

export const Capability = Type.Object(
  {
    id: CapabilityId,
    value: Type.Union([Type.Boolean(), Type.Number()]),
  },
  { additionalProperties: false },
);

export const GrantParams = Type.Object(
  {
    account_id: AccountId,
    grant_id: GrantId,
  },
  { additionalProperties: false },
);

export const GrantBody = Type.Object(
  {
    capabilities: Type.Array(Capability, { minItems: 1 }),
  },
  { additionalProperties: false },
);

export const Grant = Type.Object(
  {
    account_id: AccountId,
    capabilities: Type.Array(Capability),
    id: GrantId,
  },
  { additionalProperties: false },
);

export const GrantResponse = Type.Object(
  {
    grant: Grant,
  },
  { additionalProperties: false },
);
