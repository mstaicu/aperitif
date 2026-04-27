import { Type } from "@sinclair/typebox";

import { AdmissionState } from "../admissions/schemas.mjs";

const SpaceId = Type.String({
  description: "Stable identifier for a space resource.",
  format: "uuid",
});
const AccountId = Type.String({
  description: "Stable identifier for the account that owns this space.",
  format: "uuid",
});
const UserId = Type.String({
  description: "Stable identifier for a global user identity.",
  format: "uuid",
});
const Role = Type.String({
  description: "Domain-defined role label carried by a space membership.",
  maxLength: 64,
  minLength: 1,
});
const Count = Type.Integer({
  description: "Number of items returned in this response.",
  minimum: 0,
});
const SpaceName = Type.String({
  description: "Human-readable space name.",
  maxLength: 160,
  minLength: 1,
});

export const SpaceParams = Type.Object(
  {
    spaceId: Type.String({
      description: "Target space identifier.",
      format: "uuid",
    }),
  },
  {
    additionalProperties: false,
    description: "Path parameters for a single space resource.",
  },
);

export const SpaceMembershipParams = Type.Object(
  {
    spaceId: Type.String({
      description: "Target space identifier.",
      format: "uuid",
    }),
    userId: Type.String({
      description: "Target global user identity identifier.",
      format: "uuid",
    }),
  },
  {
    additionalProperties: false,
    description: "Path parameters for a specific membership in a space.",
  },
);

export const Space = Type.Object(
  {
    account_id: AccountId,
    id: SpaceId,
    name: SpaceName,
  },
  {
    additionalProperties: false,
    description:
      "Space authority context. A space belongs to exactly one account.",
  },
);

export const SpaceMembership = Type.Object(
  {
    role: Role,
    space_id: SpaceId,
    user_id: UserId,
  },
  {
    additionalProperties: false,
    description: "Membership linking a user identity to a space.",
  },
);

export const SpaceResponse = Type.Object(
  {
    membership: SpaceMembership,
    space: Space,
  },
  {
    additionalProperties: false,
    description: "Single space plus the caller membership in that space.",
  },
);

export const SpaceMembershipsResponse = Type.Object(
  {
    count: Count,
    memberships: Type.Array(SpaceMembership),
    space: Space,
  },
  {
    additionalProperties: false,
    description: "Memberships currently attached to a space.",
  },
);

export const SpaceAdmissionsResponse = Type.Object(
  {
    admissions: Type.Array(AdmissionState),
    count: Count,
    space: Space,
  },
  {
    additionalProperties: false,
    description:
      "Admissions currently attached to a space, including their requirement rows.",
  },
);
