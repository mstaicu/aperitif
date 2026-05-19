import { Type } from "@sinclair/typebox";

const Uuid = Type.String({
  format: "uuid",
});

export const CreateDocumentBody = Type.Object(
  {
    title: Type.String({
      minLength: 1,
    }),
    workspace_id: Uuid,
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
    workspace_id: Uuid,
  },
  {
    additionalProperties: false,
  },
);
