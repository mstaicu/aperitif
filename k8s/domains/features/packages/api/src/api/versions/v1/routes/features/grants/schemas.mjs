import { Type } from "@sinclair/typebox";

const TenantId = Type.String({
  description: "Stable identifier for a tenant resource.",
  format: "uuid",
});

const GrantId = Type.String({
  description: "Stable identifier for one current tenant feature grant.",
  format: "uuid",
});

const FeatureId = Type.String({
  description: "Stable feature identifier.",
  minLength: 1,
});

const FeatureValue = Type.Unknown({
  description: "Feature value granted to the tenant.",
});

const FeatureInput = Type.Object(
  {
    feature_id: FeatureId,
    grant_id: GrantId,
    value: FeatureValue,
  },
  {
    additionalProperties: false,
    description: "Feature grant value added to the tenant.",
  },
);

export const AddTenantFeaturesBody = Type.Object(
  {
    features: Type.Array(FeatureInput, {
      description: "Feature grant values added to this tenant.",
      minItems: 1,
    }),
    tenant_id: TenantId,
  },
  {
    additionalProperties: false,
    description: "Payload for adding current tenant feature grants.",
  },
);

export const AddTenantFeaturesResponse = Type.Object(
  {
    tenant_id: TenantId,
  },
  {
    additionalProperties: false,
    description: "Tenant whose features were recomputed.",
  },
);
