export var webauthnOpenApi = {
  "/webauthn/authentication": {
    post: {
      description:
        "Verifies the authentication assertion and updates the passkey counter.",
      requestBody: {
        content: {
          "application/json": {
            schema: {
              properties: {
                authentication: {
                  type: "object",
                },
                challenge: {
                  properties: {
                    id: {
                      description: "Identifier of the issued challenge",
                      type: "string",
                    },
                  },
                  required: ["id"],
                  type: "object",
                },
              },
              required: ["challenge", "authentication"],
              type: "object",
            },
          },
        },
        required: true,
      },
      responses: {
        200: {
          description: "Authentication successful.",
        },
        400: {
          description: "Authentication payload invalid.",
        },
        401: {
          description: "Authentication failed.",
        },
      },
      summary: "Complete passkey authentication",
      tags: ["webauthn"],
    },
  },
  "/webauthn/authentication/challenge": {
    post: {
      description: "Creates a WebAuthn authentication challenge.",
      responses: {
        200: {
          content: {
            "application/json": {
              schema: {
                properties: {
                  challenge: {
                    properties: {
                      id: {
                        description: "Identifier for the stored challenge",
                        type: "string",
                      },
                      value: {
                        description: "Base64url-encoded challenge",
                        type: "string",
                      },
                    },
                    required: ["id", "value"],
                    type: "object",
                  },
                  rp: {
                    properties: {
                      id: {
                        description: "Relying-party identifier (hostname)",
                        type: "string",
                      },
                      name: {
                        description: "Relying-party display name",
                        type: "string",
                      },
                    },
                    required: ["id", "name"],
                    type: "object",
                  },
                },
                required: ["challenge", "rp"],
                type: "object",
              },
            },
          },
          description: "Challenge issued successfully.",
        },
        503: {
          description:
            "Challenge could not be issued (dependencies unavailable).",
        },
      },
      summary: "Issue a passkey authentication challenge",
      tags: ["webauthn"],
    },
  },
  "/webauthn/registration": {
    post: {
      description:
        "Verifies the WebAuthn attestation result and stores the credential.",
      requestBody: {
        content: {
          "application/json": {
            schema: {
              properties: {
                challenge: {
                  properties: {
                    id: {
                      description:
                        "Identifier of the previously issued challenge",
                      type: "string",
                    },
                  },
                  required: ["id"],
                  type: "object",
                },
                registration: {
                  description: "WebAuthn registration payload",
                  properties: {
                    authenticatorAttachment: { nullable: true, type: "string" },
                    clientExtensionResults: { type: "object" },
                    id: { type: "string" },
                    rawId: { type: "string" },
                    response: { type: "object" },
                    type: { enum: ["public-key"], type: "string" },
                    user: {
                      properties: {
                        displayName: { nullable: true, type: "string" },
                        id: { type: "string" },
                        name: { nullable: true, type: "string" },
                      },
                      required: ["id"],
                      type: "object",
                    },
                  },
                  required: [
                    "type",
                    "id",
                    "rawId",
                    "response",
                    "clientExtensionResults",
                    "user",
                  ],
                  type: "object",
                },
              },
              required: ["challenge", "registration"],
              type: "object",
            },
          },
        },
        required: true,
      },
      responses: {
        201: {
          description: "Passkey registered successfully.",
        },
        400: {
          description: "Registration payload invalid or verification failed.",
        },
        409: {
          description: "Credential already registered for this user.",
        },
      },
      summary: "Complete passkey registration",
      tags: ["webauthn"],
    },
  },
  "/webauthn/registration/challenge": {
    post: {
      description: "Creates a WebAuthn registration challenge and user handle.",
      responses: {
        200: {
          content: {
            "application/json": {
              schema: {
                properties: {
                  challenge: {
                    properties: {
                      id: {
                        description: "Identifier of the stored challenge",
                        type: "string",
                      },
                      value: {
                        description: "Base64url-encoded challenge",
                        type: "string",
                      },
                    },
                    required: ["id", "value"],
                    type: "object",
                  },
                  rp: {
                    properties: {
                      id: {
                        description: "Relying party identifier (hostname)",
                        type: "string",
                      },
                      name: {
                        description: "Relying party display name",
                        type: "string",
                      },
                    },
                    required: ["id", "name"],
                    type: "object",
                  },
                  user: {
                    properties: {
                      id: {
                        description: "Base64url user handle",
                        type: "string",
                      },
                    },
                    required: ["id"],
                    type: "object",
                  },
                },
                required: ["challenge", "rp", "user"],
                type: "object",
              },
            },
          },
          description: "Challenge issued successfully.",
        },
        503: {
          description:
            "Challenge could not be issued (dependencies unavailable).",
        },
      },
      summary: "Issue a passkey registration challenge",
      tags: ["webauthn"],
    },
  },
};
