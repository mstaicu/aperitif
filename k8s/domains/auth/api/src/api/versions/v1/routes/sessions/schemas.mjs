import { Type } from "@sinclair/typebox";

export const RefreshBody = Type.Object(
  {
    refresh_token: Type.String(),
  },
  { additionalProperties: false },
);

export const RefreshResponse = Type.Object(
  {
    refresh_token: Type.String(),
  },
  { additionalProperties: false },
);

export const SessionTokenBody = Type.Object(
  {
    audience: Type.String({
      maxLength: 128,
      minLength: 1,
    }),
  },
  { additionalProperties: false },
);

export const SessionTokenResponse = Type.Object(
  {
    access_token: Type.String(),
  },
  { additionalProperties: false },
);
