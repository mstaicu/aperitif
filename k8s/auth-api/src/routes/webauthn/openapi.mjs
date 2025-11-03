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
                challengeId: {
                  type: "string",
                },
              },
              required: ["challengeId", "authentication"],
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
                    type: "string",
                  },
                  challengeId: {
                    type: "string",
                  },
                },
                required: ["challenge", "challengeId"],
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
        "Verifies the attestation result and stores the passkey credential.",
      requestBody: {
        content: {
          "application/json": {
            schema: {
              properties: {
                attestation: {
                  type: "object",
                },
                challengeId: {
                  type: "string",
                },
              },
              required: ["challengeId", "attestation"],
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
                    description: "Base64url-encoded challenge",
                    type: "string",
                  },
                  challengeId: {
                    description: "Identifier for the stored challenge",
                    type: "string",
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
                required: ["challenge", "challengeId", "user"],
                type: "object",
              },
            },
          },
          description: "Challenge issued successfully.",
        },
      },
      summary: "Issue a passkey registration challenge",
      tags: ["webauthn"],
    },
  },
};
