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
  description:
    "Stable identifier for the target space, when the admission is space-bound.",
  format: "uuid",
});
const UserId = Type.String({
  description:
    "Stable identifier for the bound user identity. Self-started admissions are bound at creation; space-bound invite admissions are null until claimed.",
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
    description:
      "Admission process record. Self-started admissions are post-auth and already bound to a user; space-bound invite admissions may be unbound until claimed.",
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
