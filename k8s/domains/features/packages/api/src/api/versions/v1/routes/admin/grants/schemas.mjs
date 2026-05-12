import { Type } from "@sinclair/typebox";

const TenantId = Type.String({
  description: "Stable identifier for a tenant resource.",
  format: "uuid",
});

const Code = Type.String({
  description: "Stable local code.",
  minLength: 1,
});

const FeatureValue = Type.Unknown({
  description:
    "Boolean or number feature value. It must match the feature definition type.",
});

const GrantRef = Type.String({
  description: "Stable grant reference used for idempotency.",
  maxLength: 160,
  minLength: 1,
});

export const CreateFeatureGrantBody = Type.Object(
  {
    feature_code: Code,
    grant_ref: GrantRef,
    tenant_id: TenantId,
    value: FeatureValue,
  },
  {
    additionalProperties: false,
    description: "Payload for granting one feature to a tenant.",
  },
);

export const GrantResponse = Type.Object(
  {
    tenant_id: TenantId,
  },
  {
    additionalProperties: false,
    description: "Tenant whose features were recomputed.",
  },
);
