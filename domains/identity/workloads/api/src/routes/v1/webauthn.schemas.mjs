import { Type } from "@fastify/type-provider-typebox";

const NonEmptyString = Type.String({ minLength: 1 });

export const RegistrationResponseJSON = Type.Object(
  {
    clientExtensionResults: Type.Object({}, { additionalProperties: true }),
    id: NonEmptyString,
    rawId: NonEmptyString,
    response: Type.Object(
      {
        attestationObject: NonEmptyString,
        clientDataJSON: NonEmptyString,
      },
      { additionalProperties: true },
    ),
    type: Type.Literal("public-key"),
  },
  {
    additionalProperties: true,
    description: "WebAuthn registration response produced by the client.",
  },
);

export const AuthenticationResponseJSON = Type.Object(
  {
    clientExtensionResults: Type.Object({}, { additionalProperties: true }),
    id: NonEmptyString,
    rawId: NonEmptyString,
    response: Type.Object(
      {
        authenticatorData: NonEmptyString,
        clientDataJSON: NonEmptyString,
        signature: NonEmptyString,
      },
      { additionalProperties: true },
    ),
    type: Type.Literal("public-key"),
  },
  {
    additionalProperties: true,
    description: "WebAuthn authentication response produced by the client.",
  },
);

export const RegistrationOptionsResponse = Type.Object(
  {
    challenge: NonEmptyString,
  },
  {
    additionalProperties: true,
    description: "WebAuthn registration options produced by the server.",
  },
);

export const AuthenticationOptionsResponse = Type.Object(
  {
    challenge: NonEmptyString,
  },
  {
    additionalProperties: true,
    description: "WebAuthn authentication options produced by the server.",
  },
);
