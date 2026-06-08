import { Type } from "@sinclair/typebox";

const AccountId = Type.String({
  description: "Stable identifier for a account resource.",
  format: "uuid",
});

const GrantId = Type.String({
  description: "Stable identifier for one current account capability grant.",
  format: "uuid",
});

const CapabilityId = Type.String({
  description: "Stable capability identifier.",
  minLength: 1,
});

const CapabilityValue = Type.Unknown({
  description: "Capability value granted to the account.",
});

const CapabilityInput = Type.Object(
  {
    capability_id: CapabilityId,
    grant_id: GrantId,
    value: CapabilityValue,
  },
  {
    additionalProperties: false,
    description: "Capability grant value added to the account.",
  },
);

export const AddAccountCapabilitiesBody = Type.Object(
  {
    account_id: AccountId,
    capabilities: Type.Array(CapabilityInput, {
      description: "Capability grant values added to this account.",
      minItems: 1,
    }),
  },
  {
    additionalProperties: false,
    description: "Payload for adding current account capability grants.",
  },
);

export const AddAccountCapabilitiesResponse = Type.Object(
  {
    account_id: AccountId,
  },
  {
    additionalProperties: false,
    description: "Account whose capabilities were recomputed.",
  },
);

const CapabilityRevokeInput = Type.Object(
  {
    capability_id: CapabilityId,
    grant_id: GrantId,
  },
  {
    additionalProperties: false,
    description: "Capability grant removed from the account.",
  },
);

export const RevokeAccountCapabilitiesBody = Type.Object(
  {
    account_id: AccountId,
    capabilities: Type.Array(CapabilityRevokeInput, {
      description: "Capability grant values removed from this account.",
      minItems: 1,
    }),
  },
  {
    additionalProperties: false,
    description: "Payload for revoking current account capability grants.",
  },
);

export const RevokeAccountCapabilitiesResponse = Type.Object(
  {
    account_id: AccountId,
  },
  {
    additionalProperties: false,
    description: "Account whose capabilities were recomputed.",
  },
);
