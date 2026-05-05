import { Type } from "@sinclair/typebox";

const TenantId = Type.String({
  description: "Stable identifier for a tenant resource.",
  format: "uuid",
});
const TenantRequirementId = Type.String({
  description: "Stable identifier for a tenant requirement row.",
  format: "uuid",
});
const UserId = Type.String({
  description: "Stable identifier for a global user identity.",
  format: "uuid",
});
const TenantName = Type.String({
  description: "Human-readable tenant name.",
  maxLength: 160,
  minLength: 1,
});
const RequirementType = Type.String({
  description:
    "Requirement type tracked for tenant activation, such as terms, billing_setup, or identity_verification.",
  maxLength: 128,
  minLength: 1,
});

export const TenantKind = Type.Union(
  [Type.Literal("personal"), Type.Literal("organization")],
  {
    description:
      "Tenant ownership shape. Personal tenants support individual use cases; organization tenants support business use cases.",
  },
);

export const TenantRole = Type.Union(
  [Type.Literal("owner"), Type.Literal("member")],
  {
    description: "Tenant role inside the tenant authority boundary.",
  },
);

export const TenantStatus = Type.Union(
  [Type.Literal("pending"), Type.Literal("active")],
  {
    description:
      "Tenant lifecycle status. Activation requirements move a tenant from pending to active.",
  },
);

const TenantRequirementStatus = Type.Union([
  Type.Literal("pending"),
  Type.Literal("completed"),
]);

export const TenantParams = Type.Object(
  {
    tenantId: TenantId,
  },
  {
    additionalProperties: false,
    description: "Path parameters for a single tenant resource.",
  },
);

export const TenantMembershipParams = Type.Object(
  {
    tenantId: TenantId,
    userId: UserId,
  },
  {
    additionalProperties: false,
    description: "Path parameters for a specific tenant membership.",
  },
);

export const CreateTenantBody = Type.Object(
  {
    kind: TenantKind,
    name: TenantName,
  },
  {
    additionalProperties: false,
    description: "Payload for creating a tenant owned by the caller.",
  },
);

export const Tenant = Type.Object(
  {
    id: TenantId,
    kind: TenantKind,
    name: TenantName,
    status: TenantStatus,
  },
  {
    additionalProperties: false,
    description:
      "Tenant resource. Tenants are the authority root for tenant-scoped product access.",
  },
);

export const TenantRequirement = Type.Object(
  {
    id: TenantRequirementId,
    status: TenantRequirementStatus,
    type: RequirementType,
  },
  {
    additionalProperties: false,
    description:
      "Requirement row tracked against tenant activation. Other domains fulfill these requirement types; tenancy tracks their status.",
  },
);

export const TenantMembership = Type.Object(
  {
    role: TenantRole,
    tenant_id: TenantId,
    user_id: UserId,
  },
  {
    additionalProperties: false,
    description:
      "Membership linking a user identity to a tenant control plane.",
  },
);

export const TenantsResponse = Type.Object(
  {
    tenants: Type.Array(Tenant),
  },
  {
    additionalProperties: false,
    description: "Tenants visible to the authenticated caller.",
  },
);

export const TenantResponse = Type.Object(
  {
    tenant: Tenant,
  },
  {
    additionalProperties: false,
    description: "Single tenant resource.",
  },
);

export const TenantRequirementsResponse = Type.Object(
  {
    requirements: Type.Array(TenantRequirement),
  },
  {
    additionalProperties: false,
    description: "Current activation requirements for a tenant.",
  },
);

export const TenantMembershipsResponse = Type.Object(
  {
    memberships: Type.Array(TenantMembership),
  },
  {
    additionalProperties: false,
    description: "Memberships attached to a tenant.",
  },
);

export const TenantMembershipResponse = Type.Object(
  {
    membership: TenantMembership,
  },
  {
    additionalProperties: false,
    description: "Specific tenant membership.",
  },
);
