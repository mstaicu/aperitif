import { Type } from "@fastify/type-provider-typebox";

/**
 * @param {string} description
 */
export const Base64UrlString = (description) =>
  Type.String({
    description,
    maxLength: 8192,
    minLength: 1,
    pattern: "^[A-Za-z0-9_-]+={0,2}$",
  });

export const AuthenticatorTransport = Type.Union([
  Type.Literal("ble"),
  Type.Literal("cable"),
  Type.Literal("hybrid"),
  Type.Literal("internal"),
  Type.Literal("nfc"),
  Type.Literal("smart-card"),
  Type.Literal("usb"),
]);

export const PublicKeyCredentialHint = Type.Union([
  Type.Literal("client-device"),
  Type.Literal("hybrid"),
  Type.Literal("security-key"),
]);

export const PublicKeyCredentialDescriptorJSON = Type.Object(
  {
    id: Base64UrlString("Credential identifier encoded as base64url."),
    transports: Type.Optional(
      Type.Array(AuthenticatorTransport, {
        description:
          "Authenticator transports the browser reports for this credential.",
      }),
    ),
    type: Type.Literal("public-key"),
  },
  {
    additionalProperties: false,
    description: "Credential descriptor used by the WebAuthn browser APIs.",
  },
);

export const PublicKeyCredentialUserEntityJSON = Type.Object(
  {
    displayName: Type.String({
      description: "Human-readable display name shown by the authenticator UI.",
      minLength: 1,
    }),
    id: Base64UrlString("User handle encoded as base64url."),
    name: Type.String({
      description: "Stable username label carried into the authenticator UI.",
      minLength: 1,
    }),
  },
  {
    additionalProperties: false,
    description: "User entity advertised to the browser during registration.",
  },
);

export const PublicKeyCredentialParameters = Type.Object(
  {
    alg: Type.Integer({
      description: "COSE algorithm identifier supported for the credential.",
    }),
    type: Type.Literal("public-key"),
  },
  {
    additionalProperties: false,
    description: "Credential algorithm option offered during registration.",
  },
);

export const AuthenticatorSelectionCriteria = Type.Object(
  {
    authenticatorAttachment: Type.Optional(
      Type.Union([Type.Literal("platform"), Type.Literal("cross-platform")], {
        description: "Requested authenticator attachment preference.",
      }),
    ),
    requireResidentKey: Type.Optional(
      Type.Boolean({
        description: "Legacy resident key requirement flag.",
      }),
    ),
    residentKey: Type.Optional(
      Type.String({
        description: "Requested resident key behavior.",
        minLength: 1,
      }),
    ),
    userVerification: Type.Optional(
      Type.Union(
        [
          Type.Literal("required"),
          Type.Literal("preferred"),
          Type.Literal("discouraged"),
        ],
        {
          description: "Requested user verification behavior.",
        },
      ),
    ),
  },
  {
    additionalProperties: false,
    description: "Authenticator selection policy applied to registration.",
  },
);

export const AuthenticatorAttestationResponseJSON = Type.Object(
  {
    attestationObject: Base64UrlString(
      "Attestation object returned by the authenticator during registration.",
    ),
    authenticatorData: Type.Optional(
      Base64UrlString(
        "Authenticator data, when surfaced separately by the browser.",
      ),
    ),
    clientDataJSON: Base64UrlString(
      "Client data JSON blob returned by the browser during registration.",
    ),
    publicKey: Type.Optional(
      Base64UrlString(
        "Public key bytes, when surfaced separately by the browser.",
      ),
    ),
    publicKeyAlgorithm: Type.Optional(
      Type.Integer({
        description: "COSE algorithm identifier for the surfaced public key.",
      }),
    ),
    transports: Type.Optional(
      Type.Array(AuthenticatorTransport, {
        description:
          "Authenticator transports reported for the newly created credential.",
      }),
    ),
  },
  {
    additionalProperties: false,
    description: "Authenticator registration response payload.",
  },
);

export const AuthenticatorAssertionResponseJSON = Type.Object(
  {
    authenticatorData: Base64UrlString(
      "Authenticator data returned during authentication.",
    ),
    clientDataJSON: Base64UrlString(
      "Client data JSON blob returned by the browser during authentication.",
    ),
    signature: Base64UrlString(
      "Assertion signature returned by the authenticator.",
    ),
    userHandle: Type.Optional(
      Base64UrlString(
        "User handle returned by the authenticator, when present.",
      ),
    ),
  },
  {
    additionalProperties: false,
    description: "Authenticator authentication response payload.",
  },
);

export const RegistrationResponseJSON = Type.Object(
  {
    authenticatorAttachment: Type.Optional(
      Type.Union([Type.Literal("platform"), Type.Literal("cross-platform")], {
        description: "Authenticator attachment actually used for registration.",
      }),
    ),
    clientExtensionResults: Type.Record(Type.String(), Type.Any(), {
      description:
        "Browser-reported extension results from the registration ceremony.",
    }),
    id: Base64UrlString("Credential identifier returned by the browser."),
    rawId: Base64UrlString(
      "Raw credential identifier returned by the browser.",
    ),
    response: AuthenticatorAttestationResponseJSON,
    type: Type.Literal("public-key"),
  },
  {
    additionalProperties: false,
    description: "Browser registration response forwarded to the identity API.",
  },
);

export const AuthenticationResponseJSON = Type.Object(
  {
    authenticatorAttachment: Type.Optional(
      Type.Union([Type.Literal("platform"), Type.Literal("cross-platform")], {
        description:
          "Authenticator attachment actually used for authentication.",
      }),
    ),
    clientExtensionResults: Type.Record(Type.String(), Type.Any(), {
      description:
        "Browser-reported extension results from the authentication ceremony.",
    }),
    id: Base64UrlString("Credential identifier returned by the browser."),
    rawId: Base64UrlString(
      "Raw credential identifier returned by the browser.",
    ),
    response: AuthenticatorAssertionResponseJSON,
    type: Type.Literal("public-key"),
  },
  {
    additionalProperties: false,
    description:
      "Browser authentication response forwarded to the identity API.",
  },
);

export const RegistrationChallengeResponse = Type.Object(
  {
    publicKey: Type.Object(
      {
        attestation: Type.Optional(
          Type.String({
            description:
              "Attestation conveyance preference for the registration ceremony.",
            minLength: 1,
          }),
        ),
        authenticatorSelection: Type.Optional(AuthenticatorSelectionCriteria),
        challenge: Base64UrlString(
          "One-time registration challenge encoded as base64url.",
        ),
        excludeCredentials: Type.Optional(
          Type.Array(PublicKeyCredentialDescriptorJSON, {
            description:
              "Existing credentials that should be excluded from registration.",
          }),
        ),
        extensions: Type.Optional(
          Type.Unknown({
            description:
              "Optional WebAuthn extensions advertised for registration.",
          }),
        ),
        hints: Type.Optional(
          Type.Array(PublicKeyCredentialHint, {
            description:
              "Browser hints for preferred authenticator categories.",
          }),
        ),
        pubKeyCredParams: Type.Array(PublicKeyCredentialParameters, {
          description: "Credential algorithm options offered to the browser.",
        }),
        rp: Type.Object(
          {
            id: Type.Optional(
              Type.String({
                description:
                  "Relying party identifier used for WebAuthn verification.",
                minLength: 1,
              }),
            ),
            name: Type.String({
              description: "Human-readable relying party name.",
              minLength: 1,
            }),
          },
          {
            additionalProperties: false,
            description: "Relying party descriptor for registration.",
          },
        ),
        timeout: Type.Optional(
          Type.Integer({
            description: "Browser timeout hint in milliseconds.",
            minimum: 1,
          }),
        ),
        user: PublicKeyCredentialUserEntityJSON,
      },
      {
        additionalProperties: false,
        description: "WebAuthn registration options forwarded to the browser.",
      },
    ),
  },
  {
    additionalProperties: false,
    description:
      "Registration challenge response wrapping the WebAuthn publicKey options object.",
  },
);

export const AuthenticationChallengeResponse = Type.Object(
  {
    publicKey: Type.Object(
      {
        allowCredentials: Type.Optional(
          Type.Array(PublicKeyCredentialDescriptorJSON, {
            description:
              "Allowed credentials, when the browser should scope authentication to known credentials.",
          }),
        ),
        challenge: Base64UrlString(
          "One-time authentication challenge encoded as base64url.",
        ),
        extensions: Type.Optional(
          Type.Unknown({
            description:
              "Optional WebAuthn extensions advertised for authentication.",
          }),
        ),
        hints: Type.Optional(
          Type.Array(PublicKeyCredentialHint, {
            description:
              "Browser hints for preferred authenticator categories.",
          }),
        ),
        rpId: Type.Optional(
          Type.String({
            description:
              "Relying party identifier expected during authentication.",
            minLength: 1,
          }),
        ),
        timeout: Type.Optional(
          Type.Integer({
            description: "Browser timeout hint in milliseconds.",
            minimum: 1,
          }),
        ),
        userVerification: Type.Optional(
          Type.Union(
            [
              Type.Literal("required"),
              Type.Literal("preferred"),
              Type.Literal("discouraged"),
            ],
            {
              description: "Requested user verification behavior.",
            },
          ),
        ),
      },
      {
        additionalProperties: false,
        description:
          "WebAuthn authentication options forwarded to the browser.",
      },
    ),
  },
  {
    additionalProperties: false,
    description:
      "Authentication challenge response wrapping the WebAuthn publicKey options object.",
  },
);
