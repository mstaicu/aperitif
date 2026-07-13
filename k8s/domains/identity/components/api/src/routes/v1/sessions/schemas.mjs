import { Type } from "@sinclair/typebox";

export const RefreshTokenResponse = Type.Object(
  {
    refresh_token: Type.String({
      description:
        "Rotated opaque refresh token representing the current identity session.",
      minLength: 1,
    }),
  },
  {
    additionalProperties: false,
    description:
      "Refresh token rotation result for an existing identity session.",
  },
);

export const AccessTokenResponse = Type.Object(
  {
    access_token: Type.String({
      description: "Short-lived JWT access token.",
      minLength: 1,
    }),
  },
  {
    additionalProperties: false,
    description: "Access token returned after validating the refresh token.",
  },
);
