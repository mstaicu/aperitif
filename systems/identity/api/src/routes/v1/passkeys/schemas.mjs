import { Type } from "@fastify/type-provider-typebox";

import { RegistrationResponseJSON } from "./webauthn.schemas.mjs";

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
