export var jwksOpenApi = {
  "/.well-known/jwks.json": {
    get: {
      description:
        "Returns the JSON Web Key Set used to verify auth-api signatures.",
      responses: {
        200: {
          description: "JSON Web Key Set",
        },
      },
      summary: "JWKS endpoint",
      tags: ["security"],
    },
  },
};
