import { Type } from "@sinclair/typebox";

/**
 * @param {string} description
 */
const TokenString = (description) =>
  Type.String({
    description,
    minLength: 1,
  });

export const RefreshResponse = Type.Object(
  {
    refresh_token: TokenString(
      "Rotated opaque refresh token representing the current identity session.",
    ),
  },
  {
    additionalProperties: false,
    description:
      "Refresh token rotation result for an existing identity session.",
  },
);

export const SessionTokenBody = Type.Object(
  {
    audience: Type.String({
      description:
        "Target audience for the access token. Must match one of the audiences configured for the identities service.",
      maxLength: 128,
      minLength: 1,
    }),
  },
  {
    additionalProperties: false,
    description:
      "Audience-scoped access token request carried alongside a refresh token bearer header.",
  },
);

export const SessionTokenResponse = Type.Object(
  {
    access_token: TokenString(
      "Short-lived JWT access token minted for the requested audience.",
    ),
  },
  {
    additionalProperties: false,
    description:
      "Audience-scoped access token returned after validating the refresh token.",
  },
);
