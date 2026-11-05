import { Type } from "@fastify/type-provider-typebox";

const NonEmptyString = Type.String({ minLength: 1 });
const AuthenticatorAttachment = Type.Enum(["cross-platform", "platform"]);
const ClientExtensionResults = Type.Object({
  appid: Type.Optional(Type.Boolean()),
  credProps: Type.Optional(Type.Object({ rk: Type.Optional(Type.Boolean()) })),
  hmacCreateSecret: Type.Optional(Type.Boolean()),
});
const CredentialDescriptor = Type.Object(
  {
    id: NonEmptyString,
    transports: Type.Optional(Type.Array(Type.String())),
    type: NonEmptyString,
  },
  { additionalProperties: true },
);
const CredentialHints = Type.Array(
  Type.Enum(["client-device", "hybrid", "security-key"]),
);
const UserVerificationRequirement = Type.Enum([
  "discouraged",
  "preferred",
  "required",
]);

export const RegistrationResponseJSON = Type.Object(
  {
    authenticatorAttachment: Type.Optional(AuthenticatorAttachment),
    clientExtensionResults: ClientExtensionResults,
    id: NonEmptyString,
    rawId: NonEmptyString,
    response: Type.Object({
      attestationObject: NonEmptyString,
      authenticatorData: Type.Optional(NonEmptyString),
      clientDataJSON: NonEmptyString,
      publicKey: Type.Optional(NonEmptyString),
      publicKeyAlgorithm: Type.Optional(Type.Integer()),
      transports: Type.Optional(Type.Array(Type.String())),
    }),
    type: Type.Literal("public-key"),
  },
  {
    description: "WebAuthn registration response produced by the client.",
    title: "RegistrationResponseJSON",
  },
);

export const AuthenticationResponseJSON = Type.Object(
  {
    authenticatorAttachment: Type.Optional(AuthenticatorAttachment),
    clientExtensionResults: ClientExtensionResults,
    id: NonEmptyString,
    rawId: NonEmptyString,
    response: Type.Object({
      authenticatorData: NonEmptyString,
      clientDataJSON: NonEmptyString,
      signature: NonEmptyString,
      userHandle: Type.Optional(NonEmptyString),
    }),
    type: Type.Literal("public-key"),
  },
  {
    description:
      "WebAuthn authentication response produced by the client. Verification rejects a missing or mismatched userHandle because these ceremonies use discoverable passkeys.",
    title: "AuthenticationResponseJSON",
  },
);

export const RegistrationOptionsResponse = Type.Object(
  {
    attestation: Type.Optional(
      Type.Enum(["direct", "enterprise", "indirect", "none"]),
    ),
    attestationFormats: Type.Optional(
      Type.Array(
        Type.Enum([
          "android-key",
          "android-safetynet",
          "apple",
          "fido-u2f",
          "none",
          "packed",
          "tpm",
        ]),
      ),
    ),
    authenticatorSelection: Type.Optional(
      Type.Object(
        {
          authenticatorAttachment: Type.Optional(AuthenticatorAttachment),
          requireResidentKey: Type.Optional(Type.Boolean()),
          residentKey: Type.Optional(
            Type.Enum(["discouraged", "preferred", "required"]),
          ),
          userVerification: Type.Optional(UserVerificationRequirement),
        },
        { additionalProperties: true },
      ),
    ),
    challenge: NonEmptyString,
    excludeCredentials: Type.Optional(Type.Array(CredentialDescriptor)),
    extensions: Type.Optional(
      Type.Object(
        { credProps: Type.Optional(Type.Boolean()) },
        { additionalProperties: true },
      ),
    ),
    hints: Type.Optional(CredentialHints),
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
    title: "RegistrationOptionsResponse",
  },
);

export const AuthenticationOptionsResponse = Type.Object(
  {
    allowCredentials: Type.Optional(Type.Array(CredentialDescriptor)),
    challenge: NonEmptyString,
    extensions: Type.Optional(Type.Object({}, { additionalProperties: true })),
    hints: Type.Optional(CredentialHints),
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
    title: "AuthenticationOptionsResponse",
  },
);
