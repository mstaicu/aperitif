import { Type } from "@fastify/type-provider-typebox";

import {
  AuthenticationOptionsResponse,
  AuthenticationResponseJSON,
  RegistrationOptionsResponse,
  RegistrationResponseJSON,
} from "./webauthn.schemas.mjs";

export { AuthenticationOptionsResponse, RegistrationOptionsResponse };

export const RegistrationBody = RegistrationResponseJSON;

export const AuthenticationBody = AuthenticationResponseJSON;

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
