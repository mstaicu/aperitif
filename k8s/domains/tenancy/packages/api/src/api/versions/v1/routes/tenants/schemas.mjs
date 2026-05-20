import { Type } from "@sinclair/typebox";

const TenantId = Type.String({
  description: "Stable identifier for a tenant resource.",
  format: "uuid",
});
const WorkspaceId = Type.String({
  description: "Stable identifier for a workspace resource.",
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

export const TenantParams = Type.Object(
  {
    tenantId: TenantId,
  },
  {
    additionalProperties: false,
    description: "Path parameters for a single tenant resource.",
  },
);

export const CreateTenantBody = Type.Object(
  {
    name: TenantName,
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
  },
  {
    additionalProperties: false,
    description:
      "Tenant resource. Tenants are the authority root for tenant-scoped access.",
  },
);

export const Workspace = Type.Object(
  {
    id: WorkspaceId,
    name: WorkspaceName,
    tenant_id: TenantId,
  },
  {
    additionalProperties: false,
    description:
      "Workspace resource. Workspaces are operational containers inside a tenant.",
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

export const CreateWorkspaceResponse = Type.Object(
  {
    workspace: Workspace,
  },
  {
    additionalProperties: false,
    description: "Created workspace.",
  },
);
