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
    token_type: Type.Literal("Bearer", {
      description: "Authorization scheme used with the access token.",
    }),
  },
  {
    additionalProperties: false,
    description:
      "Access token created for the authenticated session. Supply it to APIs as Authorization: Bearer <access_token>.",
  },
);
