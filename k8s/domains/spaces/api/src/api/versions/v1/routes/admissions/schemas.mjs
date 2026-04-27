import { Type } from "@sinclair/typebox";

const AdmissionId = Type.String({
  description: "Stable identifier for an admission resource.",
  format: "uuid",
});
const AdmissionRequirementId = Type.String({
  description: "Stable identifier for an admission requirement row.",
  format: "uuid",
});
const SpaceId = Type.String({
  description: "Stable identifier for the target space.",
  format: "uuid",
});
const UserId = Type.String({
  description:
    "Stable identifier for the bound user identity. Invite admissions are null until claimed.",
  format: "uuid",
});
const Role = Type.String({
  description: "Role requested by the admission.",
  maxLength: 64,
  minLength: 1,
});
const RequirementType = Type.String({
  description:
    "Requirement type tracked for this admission, such as profile, terms, or kyc.",
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

export const AdmissionRequirementParams = Type.Object(
  {
    admissionId: Type.String({
      description: "Target admission identifier.",
      format: "uuid",
    }),
    type: RequirementType,
  },
  {
    additionalProperties: false,
    description: "Path parameters for a specific admission requirement type.",
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
    space_id: SpaceId,
    status: AdmissionStatus,
    user_id: Type.Union([UserId, Type.Null()]),
  },
  {
    additionalProperties: false,
    description:
      "Admission process record for joining a space. Invite admissions may be unbound until claimed.",
  },
);

export const AdmissionRequirement = Type.Object(
  {
    id: AdmissionRequirementId,
    status: AdmissionRequirementStatus,
    type: RequirementType,
  },
  {
    additionalProperties: false,
    description:
      "Requirement row tracked against an admission. Other domains fulfill these requirement types; spaces tracks their status.",
  },
);

export const AdmissionState = Type.Object(
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

export const AdmissionStateResponse = AdmissionState;
