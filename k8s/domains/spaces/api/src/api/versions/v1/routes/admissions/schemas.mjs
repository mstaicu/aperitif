import { Type } from "@sinclair/typebox";

const AdmissionId = Type.String({ format: "uuid" });
const SpaceId = Type.String({ format: "uuid" });
const UserId = Type.String({ format: "uuid" });
const Role = Type.String({ maxLength: 64, minLength: 1 });
const Requirement = Type.String({ maxLength: 128, minLength: 1 });

const AdmissionStatus = Type.Union([
  Type.Literal("open"),
  Type.Literal("completed"),
  Type.Literal("failed"),
  Type.Literal("cancelled"),
  Type.Literal("expired"),
]);

const AdmissionRequirementStatus = Type.Union([
  Type.Literal("pending"),
  Type.Literal("completed"),
  Type.Literal("failed"),
]);

export const AdmissionParams = Type.Object(
  {
    admissionId: AdmissionId,
  },
  { additionalProperties: false },
);

export const SpaceAdmissionBody = Type.Object(
  {
    requested_role: Role,
  },
  { additionalProperties: false },
);

export const Admission = Type.Object(
  {
    id: AdmissionId,
    requested_role: Role,
    space_id: Type.Union([SpaceId, Type.Null()]),
    status: AdmissionStatus,
    user_id: Type.Union([UserId, Type.Null()]),
  },
  { additionalProperties: false },
);

export const AdmissionRequirement = Type.Object(
  {
    requirement: Requirement,
    status: AdmissionRequirementStatus,
  },
  { additionalProperties: false },
);

export const AdmissionResponse = Type.Object(
  {
    admission: Admission,
  },
  { additionalProperties: false },
);

export const CreateAdmissionResponse = Type.Object(
  {
    admission: Admission,
    requirements: Type.Array(AdmissionRequirement),
  },
  { additionalProperties: false },
);

export const GetAdmissionResponse = Type.Object(
  {
    admission: Admission,
    requirements: Type.Array(AdmissionRequirement),
  },
  { additionalProperties: false },
);

export const ClaimAdmissionResponse = AdmissionResponse;
