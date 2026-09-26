import { Type } from "@fastify/type-provider-typebox";

import {
  AuthenticationOptionsResponse,
  AuthenticationResponseJSON,
  RegistrationOptionsResponse,
  RegistrationResponseJSON,
} from "./webauthn.schemas.mjs";

export { AuthenticationOptionsResponse, RegistrationOptionsResponse };

const PasskeyName = Type.String({
  description: "Name chosen by the user for this passkey.",
  maxLength: 100,
  minLength: 1,
  pattern: "\\S",
});

export const AddPasskeyBody = Type.Object(
  {
    credential: RegistrationResponseJSON,
    name: PasskeyName,
  },
  { additionalProperties: false },
);

export const AuthenticationBody = AuthenticationResponseJSON;

export const Passkey = Type.Object(
  {
    created_at: Type.String({ format: "date-time" }),
    id: Type.String({ format: "uuid" }),
    name: PasskeyName,
  },
  {
    additionalProperties: false,
    description: "Passkey management metadata.",
  },
);

export const PasskeyIdParams = Type.Object(
  {
    id: Type.String({ format: "uuid" }),
  },
  { additionalProperties: false },
);

export const PasskeysResponse = Type.Object(
  {
    passkeys: Type.Array(Passkey),
  },
  { additionalProperties: false },
);

export const RegistrationBody = RegistrationResponseJSON;

export const RenamePasskeyBody = Type.Object(
  {
    name: PasskeyName,
  },
  { additionalProperties: false },
);

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
