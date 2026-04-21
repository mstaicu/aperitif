import { Type } from "@sinclair/typebox";

const SpaceId = Type.String({
  description: "Stable identifier for a space resource.",
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

export const SpaceMemberParams = Type.Object(
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

// NOTE: user_id is assumed to be a valid global identity UUID resolved
// outside this domain. Spaces does not verify user existence yet.
export const CreateSpaceMemberBody = Type.Object(
  {
    role: Type.String({
      description: "Role to grant to the target user in the target space.",
      maxLength: 64,
      minLength: 1,
    }),
  },
  {
    additionalProperties: false,
    description: "Payload for creating a direct membership in a space.",
  },
);

export const Space = Type.Object(
  {
    id: SpaceId,
  },
  {
    additionalProperties: false,
    description: "Space resource.",
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

export const SpaceAccess = Type.Object(
  {
    membership: SpaceMembership,
    space: Space,
  },
  {
    additionalProperties: false,
    description: "Space plus the caller membership in that space.",
  },
);

export const SpacesResponse = Type.Object(
  {
    count: Count,
    spaces: Type.Array(SpaceAccess),
  },
  {
    additionalProperties: false,
    description: "Spaces visible to the authenticated caller.",
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

export const SpaceCreateResponse = Type.Object(
  {
    membership: SpaceMembership,
    space: Space,
  },
  {
    additionalProperties: false,
    description: "Created space plus the bootstrap owner membership.",
  },
);

export const SpaceMembersResponse = Type.Object(
  {
    count: Count,
    members: Type.Array(SpaceMembership),
    space: Space,
  },
  {
    additionalProperties: false,
    description: "Memberships currently attached to a space.",
  },
);

export const SpaceMemberResponse = Type.Object(
  {
    membership: SpaceMembership,
    space: Space,
  },
  {
    additionalProperties: false,
    description: "Created or fetched membership for a specific space.",
  },
);
