import { Type } from "@sinclair/typebox";

const TenantId = Type.String({
  description: "Stable identifier for a tenant resource.",
  format: "uuid",
});
const WorkspaceId = Type.String({
  description: "Stable identifier for a workspace resource.",
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
const WorkspaceName = Type.String({
  description: "Human-readable workspace name.",
  maxLength: 160,
  minLength: 1,
});

export const TenantType = Type.Union(
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
  [Type.Literal("active"), Type.Literal("archived")],
  {
    description: "Tenant lifecycle status.",
  },
);

const WorkspaceStatus = Type.Union(
  [Type.Literal("active"), Type.Literal("archived")],
  {
    description: "Workspace lifecycle status.",
  },
);

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
    name: TenantName,
    type: TenantType,
  },
  {
    additionalProperties: false,
    description: "Payload for creating a tenant owned by the caller.",
  },
);

export const CreateWorkspaceBody = Type.Object(
  {
    name: WorkspaceName,
  },
  {
    additionalProperties: false,
    description: "Payload for creating a workspace inside a tenant.",
  },
);

export const Tenant = Type.Object(
  {
    id: TenantId,
    name: TenantName,
    status: TenantStatus,
    type: TenantType,
  },
  {
    additionalProperties: false,
    description:
      "Tenant resource. Tenants are the authority root for tenant-scoped product access.",
  },
);

export const Workspace = Type.Object(
  {
    id: WorkspaceId,
    name: WorkspaceName,
    status: WorkspaceStatus,
    tenant_id: TenantId,
  },
  {
    additionalProperties: false,
    description:
      "Workspace resource. Workspaces are operational containers inside a tenant.",
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

export const CreateTenantResponse = Type.Object(
  {
    tenant: Tenant,
  },
  {
    additionalProperties: false,
    description: "Created tenant.",
  },
);

export const CreateWorkspaceResponse = Type.Object(
  {
    workspace: Workspace,
  },
  {
    additionalProperties: false,
    description: "Created workspace.",
  },
);

export const TenantWorkspacesResponse = Type.Object(
  {
    workspaces: Type.Array(Workspace),
  },
  {
    additionalProperties: false,
    description: "Workspaces attached to a tenant.",
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
