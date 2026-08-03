import { Type } from "@fastify/type-provider-typebox";

export const AccessTokenResponse = Type.Object(
  {
    access_token: Type.String({
      description: "Short-lived JWT access token.",
      minLength: 1,
    }),
    expires_in: Type.Literal(300, {
      description: "Access-token lifetime in seconds.",
    }),
    token_type: Type.Literal("Bearer"),
  },
  {
    additionalProperties: false,
    description:
      "Access token returned after validating the current session refresh token.",
  },
);
