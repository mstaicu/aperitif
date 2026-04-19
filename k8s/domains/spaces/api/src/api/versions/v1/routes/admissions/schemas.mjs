import { Type } from "@sinclair/typebox";

const AdmissionId = Type.String({ format: "uuid" });
const SpaceId = Type.String({ format: "uuid" });
const UserId = Type.String({ format: "uuid" });
const Role = Type.String({ maxLength: 64, minLength: 1 });
const Requirement = Type.String({ maxLength: 128, minLength: 1 });

export const AdmissionParams = Type.Object(
  {
    admissionId: AdmissionId,
  },
  { additionalProperties: false },
);

export const CreateAdmissionBody = Type.Object(
  {
    requested_role: Role,
    requirements: Type.Optional(Type.Array(Requirement)),
    space_id: Type.Optional(Type.Union([SpaceId, Type.Null()])),
  },
  { additionalProperties: false },
);

export const Admission = Type.Object(
  {
    id: AdmissionId,
    requested_role: Role,
    space_id: Type.Union([SpaceId, Type.Null()]),
    status: Type.String(),
    user_id: Type.Union([UserId, Type.Null()]),
  },
  { additionalProperties: false },
);

export const AdmissionRequirement = Type.Object(
  {
    requirement: Requirement,
    status: Type.String(),
  },
  { additionalProperties: false },
);

export const AdmissionMembership = Type.Object(
  {
    role: Role,
  },
  { additionalProperties: false },
);

export const AdmissionSpace = Type.Object(
  {
    id: SpaceId,
  },
  { additionalProperties: false },
);

export const CreateAdmissionResponse = Type.Object(
  {
    admission: Admission,
    membership: Type.Optional(AdmissionMembership),
    requirements: Type.Array(AdmissionRequirement),
    space: Type.Optional(AdmissionSpace),
  },
  { additionalProperties: false },
);

export const GetAdmissionResponse = Type.Object(
  {
    admission: Admission,
    membership: Type.Optional(AdmissionMembership),
    requirements: Type.Array(AdmissionRequirement),
    space: Type.Optional(AdmissionSpace),
  },
  { additionalProperties: false },
);

export const ClaimAdmissionBody = Type.Object(
  {},
  { additionalProperties: false },
);

export const ClaimAdmissionResponse = Type.Object(
  {
    admission: Admission,
    membership: Type.Optional(AdmissionMembership),
    space: Type.Optional(AdmissionSpace),
  },
  { additionalProperties: false },
);
