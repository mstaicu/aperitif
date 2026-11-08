import { Type } from "@fastify/type-provider-typebox";

export const SessionResponse = Type.Object(
  {
    expires_in: Type.Integer({
      description: "Session lifetime in seconds.",
      minimum: 1,
    }),
    session_token: Type.String({
      description: "Opaque bearer credential for the newly created session.",
      minLength: 1,
    }),
  },
  {
    additionalProperties: false,
    description: "Credential and lifetime for the newly created session.",
  },
);

export const AccessTokenResponse = Type.Object(
  {
    access_token: Type.String({
      description: "Short-lived JWT access token.",
      minLength: 1,
    }),
    expires_in: Type.Integer({
      description: "Access-token lifetime in seconds.",
      minimum: 1,
    }),
  },
  {
    additionalProperties: false,
    description:
      "Access token created for the authenticated session. Supply it to APIs as Authorization: Bearer <access_token>.",
  },
);
