import { Type } from "@sinclair/typebox";

const Uuid = Type.String({
  format: "uuid",
});

export const CreateDocumentBody = Type.Object(
  {
    title: Type.String({
      minLength: 1,
    }),
  },
  {
    additionalProperties: false,
  },
);

export const TenantParams = Type.Object(
  {
    tenant_id: Uuid,
  },
  {
    additionalProperties: false,
  },
);

export const DocumentResponse = Type.Object(
  {
    created_by: Uuid,
    id: Uuid,
    tenant_id: Uuid,
    title: Type.String(),
  },
  {
    additionalProperties: false,
  },
);

export const DocumentsResponse = Type.Array(DocumentResponse);
