import { Type } from "@fastify/type-provider-typebox";

const NonEmptyString = Type.String({ minLength: 1 });
const UserVerificationRequirement = Type.Union([
  Type.Literal("discouraged"),
  Type.Literal("preferred"),
  Type.Literal("required"),
]);

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
        userHandle: NonEmptyString,
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
    attestation: Type.Optional(
      Type.Union([
        Type.Literal("direct"),
        Type.Literal("enterprise"),
        Type.Literal("indirect"),
        Type.Literal("none"),
      ]),
    ),
    authenticatorSelection: Type.Optional(
      Type.Object(
        {
          authenticatorAttachment: Type.Optional(
            Type.Union([
              Type.Literal("cross-platform"),
              Type.Literal("platform"),
            ]),
          ),
          requireResidentKey: Type.Optional(Type.Boolean()),
          residentKey: Type.Optional(
            Type.Union([
              Type.Literal("discouraged"),
              Type.Literal("preferred"),
              Type.Literal("required"),
            ]),
          ),
          userVerification: Type.Optional(UserVerificationRequirement),
        },
        { additionalProperties: true },
      ),
    ),
    challenge: NonEmptyString,
    excludeCredentials: Type.Optional(
      Type.Array(
        Type.Object(
          {
            id: NonEmptyString,
            transports: Type.Optional(Type.Array(Type.String())),
            type: NonEmptyString,
          },
          { additionalProperties: true },
        ),
      ),
    ),
    extensions: Type.Optional(
      Type.Object(
        { credProps: Type.Optional(Type.Boolean()) },
        { additionalProperties: true },
      ),
    ),
    hints: Type.Optional(
      Type.Array(
        Type.Union([
          Type.Literal("client-device"),
          Type.Literal("hybrid"),
          Type.Literal("security-key"),
        ]),
      ),
    ),
    pubKeyCredParams: Type.Array(
      Type.Object(
        { alg: Type.Integer(), type: Type.Literal("public-key") },
        { additionalProperties: true },
      ),
    ),
    rp: Type.Object(
      { id: Type.Optional(NonEmptyString), name: NonEmptyString },
      { additionalProperties: true },
    ),
    timeout: Type.Optional(
      Type.Integer({
        description: "Ceremony timeout in milliseconds.",
        minimum: 0,
      }),
    ),
    user: Type.Object(
      { displayName: Type.String(), id: NonEmptyString, name: NonEmptyString },
      { additionalProperties: true },
    ),
  },
  {
    additionalProperties: true,
    description: "WebAuthn registration options produced by the server.",
  },
);

export const AuthenticationOptionsResponse = Type.Object(
  {
    challenge: NonEmptyString,
    rpId: Type.Optional(NonEmptyString),
    timeout: Type.Optional(
      Type.Integer({
        description: "Ceremony timeout in milliseconds.",
        minimum: 0,
      }),
    ),
    userVerification: Type.Optional(UserVerificationRequirement),
  },
  {
    additionalProperties: true,
    description: "WebAuthn authentication options produced by the server.",
  },
);
