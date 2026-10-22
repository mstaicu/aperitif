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
  pattern: "^(?=[\\s\\S]*\\S)[^\\u0000]+$",
});

export const RegisterPasskeyBody = Type.Object(
  {
    authentication: Type.Optional(AuthenticationResponseJSON),
    credential: RegistrationResponseJSON,
    name: Type.Optional(PasskeyName),
  },
  { additionalProperties: false },
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

export const RemovePasskeyBody = Type.Object(
  { authentication: AuthenticationResponseJSON },
  { additionalProperties: false },
);
