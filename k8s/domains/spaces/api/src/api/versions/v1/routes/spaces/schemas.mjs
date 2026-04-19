import { Type } from "@sinclair/typebox";

const SpaceId = Type.String({ format: "uuid" });
const UserId = Type.String({ format: "uuid" });
const Role = Type.String({ maxLength: 64, minLength: 1 });

export const SpaceParams = Type.Object(
  {
    spaceId: SpaceId,
  },
  { additionalProperties: false },
);

export const SpaceMemberParams = Type.Object(
  {
    spaceId: SpaceId,
    userId: UserId,
  },
  { additionalProperties: false },
);

export const CreateSpaceBody = Type.Object({}, { additionalProperties: false });

// NOTE: user_id is assumed to be a valid global identity UUID resolved
// outside this domain. Spaces does not verify user existence yet.
export const CreateSpaceMemberBody = Type.Object(
  {
    role: Role,
    user_id: UserId,
  },
  { additionalProperties: false },
);

export const Space = Type.Object(
  {
    id: SpaceId,
  },
  { additionalProperties: false },
);

export const Membership = Type.Object(
  {
    role: Role,
  },
  { additionalProperties: false },
);

export const Member = Type.Object(
  {
    role: Role,
    user_id: UserId,
  },
  { additionalProperties: false },
);

export const SpaceListItem = Type.Object(
  {
    id: SpaceId,
    role: Role,
  },
  { additionalProperties: false },
);

export const SpacesResponse = Type.Object(
  {
    spaces: Type.Array(SpaceListItem),
  },
  { additionalProperties: false },
);

export const SpaceResponse = Type.Object(
  {
    membership: Membership,
    space: Space,
  },
  { additionalProperties: false },
);

export const SpaceMembersResponse = Type.Object(
  {
    members: Type.Array(Member),
  },
  { additionalProperties: false },
);

export const SpaceMemberResponse = Type.Object(
  {
    membership: Type.Object(
      {
        role: Role,
        space_id: SpaceId,
        user_id: UserId,
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);
