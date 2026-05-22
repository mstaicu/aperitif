import { Type } from "@sinclair/typebox";

const TenantId = Type.String({
  description: "Stable identifier for a tenant resource.",
  format: "uuid",
});

const GrantId = Type.String({
  description: "Stable identifier for one current tenant capability grant.",
  format: "uuid",
});

const CapabilityId = Type.String({
  description: "Stable capability identifier.",
  minLength: 1,
});

const CapabilityValue = Type.Unknown({
  description: "Capability value granted to the tenant.",
});

const CapabilityInput = Type.Object(
  {
    capability_id: CapabilityId,
    grant_id: GrantId,
    value: CapabilityValue,
  },
  {
    additionalProperties: false,
    description: "Capability grant value added to the tenant.",
  },
);

export const AddTenantCapabilitiesBody = Type.Object(
  {
    capabilities: Type.Array(CapabilityInput, {
      description: "Capability grant values added to this tenant.",
      minItems: 1,
    }),
    tenant_id: TenantId,
  },
  {
    additionalProperties: false,
    description: "Payload for adding current tenant capability grants.",
  },
);

export const AddTenantCapabilitiesResponse = Type.Object(
  {
    tenant_id: TenantId,
  },
  {
    additionalProperties: false,
    description: "Tenant whose capabilities were recomputed.",
  },
);
