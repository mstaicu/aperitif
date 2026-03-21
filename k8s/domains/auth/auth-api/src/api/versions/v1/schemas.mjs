import { Type } from "@sinclair/typebox";

const Base64URLString = Type.String({
  maxLength: 8192,
  minLength: 1,
  pattern: "^[A-Za-z0-9_-]+={0,2}$",
});

const AuthenticatorTransport = Type.Union([
  Type.Literal("ble"),
  Type.Literal("cable"),
  Type.Literal("hybrid"),
  Type.Literal("internal"),
  Type.Literal("nfc"),
  Type.Literal("smart-card"),
  Type.Literal("usb"),
]);

const PublicKeyCredentialDescriptorJSON = Type.Object({
  id: Base64URLString,
  transports: Type.Optional(Type.Array(AuthenticatorTransport)),
  type: Type.Literal("public-key"),
});

const PublicKeyCredentialUserEntityJSON = Type.Object({
  displayName: Type.String(),
  id: Base64URLString,
  name: Type.String(),
});

const PublicKeyCredentialParameters = Type.Object({
  alg: Type.Integer(),
  type: Type.Literal("public-key"),
});

const AuthenticatorSelectionCriteria = Type.Object({
  authenticatorAttachment: Type.Optional(
    Type.Union([Type.Literal("platform"), Type.Literal("cross-platform")]),
  ),
  requireResidentKey: Type.Optional(Type.Boolean()),
  residentKey: Type.Optional(Type.String()),
  userVerification: Type.Optional(
    Type.Union([
      Type.Literal("required"),
      Type.Literal("preferred"),
      Type.Literal("discouraged"),
    ]),
  ),
});

const AuthenticatorAttestationResponseJSON = Type.Object({
  attestationObject: Base64URLString,
  authenticatorData: Type.Optional(Base64URLString),
  clientDataJSON: Base64URLString,
  publicKey: Type.Optional(Base64URLString),
  publicKeyAlgorithm: Type.Optional(Type.Integer()),
  transports: Type.Optional(Type.Array(AuthenticatorTransport)),
});

const AuthenticatorAssertionResponseJSON = Type.Object({
  authenticatorData: Base64URLString,
  clientDataJSON: Base64URLString,
  signature: Base64URLString,
  userHandle: Type.Optional(Base64URLString),
});

const RegistrationResponseJSON = Type.Object({
  authenticatorAttachment: Type.Optional(
    Type.Union([Type.Literal("platform"), Type.Literal("cross-platform")]),
  ),
  clientExtensionResults: Type.Record(Type.String(), Type.Any()),
  id: Base64URLString,
  rawId: Base64URLString,
  response: AuthenticatorAttestationResponseJSON,
  type: Type.Literal("public-key"),
});

const AuthenticationResponseJSON = Type.Object({
  authenticatorAttachment: Type.Optional(
    Type.Union([Type.Literal("platform"), Type.Literal("cross-platform")]),
  ),
  clientExtensionResults: Type.Record(Type.String(), Type.Any()),
  id: Base64URLString,
  rawId: Base64URLString,
  response: AuthenticatorAssertionResponseJSON,
  type: Type.Literal("public-key"),
});

export const RegistrationChallengeResponse = Type.Object({
  publicKey: Type.Object({
    attestation: Type.Optional(Type.String()),

    authenticatorSelection: Type.Optional(AuthenticatorSelectionCriteria),

    challenge: Base64URLString,

    excludeCredentials: Type.Optional(
      Type.Array(PublicKeyCredentialDescriptorJSON),
    ),

    extensions: Type.Optional(Type.Unknown()),

    pubKeyCredParams: Type.Array(PublicKeyCredentialParameters),

    rp: Type.Object({
      id: Type.Optional(Type.String()),
      name: Type.String(),
    }),

    timeout: Type.Optional(Type.Integer()),

    user: PublicKeyCredentialUserEntityJSON,
  }),
});

export const AuthenticationChallengeResponse = Type.Object({
  publicKey: Type.Object({
    allowCredentials: Type.Optional(
      Type.Array(PublicKeyCredentialDescriptorJSON),
    ),

    challenge: Base64URLString,

    extensions: Type.Optional(Type.Unknown()),

    rpId: Type.Optional(Type.String()),

    timeout: Type.Optional(Type.Integer()),

    userVerification: Type.Optional(
      Type.Union([
        Type.Literal("required"),
        Type.Literal("preferred"),
        Type.Literal("discouraged"),
      ]),
    ),
  }),
});

export const RegistrationBody = Type.Object(
  {
    credential: RegistrationResponseJSON,
  },
  { additionalProperties: false },
);

export const LoginBody = Type.Object(
  {
    authentication: AuthenticationResponseJSON,
  },
  { additionalProperties: false },
);

export const RegistrationSuccessResponse = Type.Object(
  {
    refresh_token: Type.String(),
  },
  { additionalProperties: false },
);

export const LoginSuccessResponse = Type.Object(
  {
    refresh_token: Type.String(),
  },
  { additionalProperties: false },
);

export const RefreshBody = Type.Object(
  {
    refresh_token: Type.String(),
  },
  { additionalProperties: false },
);

export const RefreshResponse = Type.Object(
  {
    refresh_token: Type.String(),
  },
  { additionalProperties: false },
);

export const ExchangeBody = Type.Object(
  {
    refresh_token: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const ErrorResponse = Type.Null();
export const EmptyResponse = Type.Null();
