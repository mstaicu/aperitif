import { Type } from "@sinclair/typebox";

/**
 * @param {string} description
 */
const TokenString = (description) =>
  Type.String({
    description,
    minLength: 1,
  });

export const RefreshTokenResponse = Type.Object(
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

export const AccessTokenResponse = Type.Object(
  {
    access_token: TokenString(
      "Short-lived JWT access token minted for the product API audience.",
    ),
  },
  {
    additionalProperties: false,
    description:
      "Product API access token returned after validating the refresh token.",
  },
);
