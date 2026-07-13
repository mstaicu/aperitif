import { Type } from "@sinclair/typebox";

export const AccessTokenResponse = Type.Object(
  {
    access_token: Type.String({
      description: "Short-lived JWT access token.",
      minLength: 1,
    }),
    refresh_token: Type.String({
      description:
        "Rotated opaque refresh token representing the current identity session.",
      minLength: 1,
    }),
  },
  {
    additionalProperties: false,
    description:
      "Access token and rotated refresh token returned after validating the current refresh token.",
  },
);
