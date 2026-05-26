import { Type } from "@sinclair/typebox";

const TenantId = Type.String({
  description: "Stable identifier for a tenant resource.",
  format: "uuid",
});
const UserId = Type.String({
  description: "Stable identifier for a user resource.",
  format: "uuid",
});
const RoleId = Type.String({
  description: "Stable tenant role identifier.",
  minLength: 1,
});
const TenantName = Type.String({
  description: "Human-readable tenant name.",
  maxLength: 160,
  minLength: 1,
});

export const CreateTenantBody = Type.Object(
  {
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
    name: TenantName,
  },
  {
    additionalProperties: false,
    description:
      "Tenant resource. Tenants are the authority root for tenant-scoped access.",
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

export const CreateTenantResponse = Type.Object(
  {
    tenant: Tenant,
  },
  {
    additionalProperties: false,
    description: "Created tenant.",
  },
);

export const AssignTenantMemberRoleBody = Type.Object(
  {
    role_id: RoleId,
  },
  {
    additionalProperties: false,
    description: "Payload for assigning a role to a tenant member.",
  },
);

export const TenantMemberParams = Type.Object(
  {
    tenant_id: TenantId,
    user_id: UserId,
  },
  {
    additionalProperties: false,
    description: "Path parameters for a tenant member.",
  },
);

export const TenantMemberResponse = Type.Object(
  {
    tenant_id: TenantId,
    user_id: UserId,
  },
  {
    additionalProperties: false,
    description: "Tenant member.",
  },
);

export const AssignTenantMemberRoleResponse = Type.Object(
  {
    tenant_id: TenantId,
    user_id: UserId,
  },
  {
    additionalProperties: false,
    description: "Tenant member whose permissions were recomputed.",
  },
);
