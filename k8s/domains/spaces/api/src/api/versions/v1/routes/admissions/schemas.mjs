import { Type } from "@sinclair/typebox";

const AdmissionId = Type.String({
  description: "Stable identifier for an admission resource.",
  format: "uuid",
});
const SpaceId = Type.String({
  description:
    "Stable identifier for the target space, when the admission is space-bound.",
  format: "uuid",
});
const UserId = Type.String({
  description: "Stable identifier for the claimed user identity, when present.",
  format: "uuid",
});
const Role = Type.String({
  description: "Role requested by the admission.",
  maxLength: 64,
  minLength: 1,
});
const Requirement = Type.String({
  description: "Requirement name tracked for this admission.",
  maxLength: 128,
  minLength: 1,
});

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
    admissionId: Type.String({
      description: "Target admission identifier.",
      format: "uuid",
    }),
  },
  {
    additionalProperties: false,
    description: "Path parameters for a single admission resource.",
  },
);

export const SpaceAdmissionBody = Type.Object(
  {
    requested_role: Type.String({
      description: "Role being requested for the created admission.",
      maxLength: 64,
      minLength: 1,
    }),
  },
  {
    additionalProperties: false,
    description: "Payload for creating a space-bound admission.",
  },
);

export const Admission = Type.Object(
  {
    id: AdmissionId,
    requested_role: Role,
    space_id: Type.Union([SpaceId, Type.Null()]),
    status: AdmissionStatus,
    user_id: Type.Union([UserId, Type.Null()]),
  },
  {
    additionalProperties: false,
    description: "Admission resource.",
  },
);

export const AdmissionRequirement = Type.Object(
  {
    requirement: Requirement,
    status: AdmissionRequirementStatus,
  },
  {
    additionalProperties: false,
    description: "Requirement tracked against an admission.",
  },
);

export const AdmissionStateResponse = Type.Object(
  {
    admission: Admission,
    requirements: Type.Array(AdmissionRequirement),
  },
  {
    additionalProperties: false,
    description:
      "Admission state together with the currently known requirement rows.",
  },
);
