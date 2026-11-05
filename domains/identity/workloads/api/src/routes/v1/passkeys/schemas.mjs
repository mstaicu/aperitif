import { Type } from "@fastify/type-provider-typebox";

import {
  AuthenticationOptionsResponse,
  AuthenticationResponseJSON,
  RegistrationOptionsResponse,
  RegistrationResponseJSON,
} from "./webauthn.schemas.mjs";

const PasskeyName = Type.String({
  description: "Name chosen by the user for this passkey.",
  maxLength: 100,
  minLength: 1,
  pattern: "^(?=[\\s\\S]*\\S)[^\\u0000]+$",
});

export const PasskeyRegistrationBody = Type.Object(
  {
    name: Type.Optional(PasskeyName),
    registration: RegistrationResponseJSON,
  },
  { additionalProperties: false, title: "PasskeyRegistrationBody" },
);

export const Passkey = Type.Object(
  {
    created_at: Type.String({ format: "date-time" }),
    id: Type.String({ format: "uuid" }),
    name: PasskeyName,
  },
  {
    additionalProperties: false,
    description: "Passkey management metadata.",
    title: "Passkey",
  },
);

export const PasskeyIdParams = Type.Object(
  {
    id: Type.String({ format: "uuid" }),
  },
  { additionalProperties: false, title: "PasskeyIdParams" },
);

export const PasskeysResponse = Type.Object(
  {
    passkeys: Type.Array(Passkey),
  },
  { additionalProperties: false, title: "PasskeysResponse" },
);

export const PasskeyAdditionBody = Type.Object(
  {
    authentication: AuthenticationResponseJSON,
    name: Type.Optional(PasskeyName),
    registration: RegistrationResponseJSON,
  },
  { additionalProperties: false, title: "PasskeyAdditionBody" },
);

export const PasskeyAdditionOptionsResponse = Type.Object(
  {
    authentication: AuthenticationOptionsResponse,
    registration: RegistrationOptionsResponse,
  },
  { additionalProperties: false, title: "PasskeyAdditionOptionsResponse" },
);
