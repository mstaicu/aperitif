## domains/auth/auth-api/.dockerignore
```
node_modules
Dockerfile```

## domains/auth/auth-api/Dockerfile
```
FROM node:25-alpine AS base

RUN apk add --no-cache tini

WORKDIR /home/node/app
ENTRYPOINT ["/sbin/tini", "--"]

# DEPS
FROM base AS deps

COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev --strict-peer-deps

# DEV
FROM base AS dev

ENV NODE_ENV=development

COPY --chown=node:node package*.json ./
RUN npm ci

COPY --chown=node:node . .

# 9229 should be for debugger
EXPOSE 3000 9229

USER node

# tini
#   â””â”€â”€ nodemon
#         â””â”€â”€ node
CMD ["./node_modules/.bin/nodemon", "-r", "./src/otel.mjs", "src/index.mjs"]

# PROD
FROM base AS prod

ENV NODE_ENV=production

COPY --from=deps /home/node/app/node_modules ./node_modules
COPY --chown=node:node . .

EXPOSE 3000

USER node

# tini
#   â””â”€â”€ node
CMD ["node", "src/index.mjs"]```

## domains/auth/auth-api/eslint.config.mjs
```
import pluginJs from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginPerfectionst from "eslint-plugin-perfectionist";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";

export default [
  {
    languageOptions: {
      globals: globals.node,
    },
  },
  pluginJs.configs.recommended,
  eslintPluginPerfectionst.configs["recommended-natural"],
  eslintPluginPrettierRecommended,
  eslintConfigPrettier,
];
```

## domains/auth/auth-api/jsconfig.json
```
{
  "compilerOptions": {
    "checkJs": true,
    "strict": true,
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "lib": ["ES2024"]
  },
  "exclude": ["node_modules"]
}
```

## domains/auth/auth-api/package.json
```
{
  "private": true,
  "overrides": {
    "minimatch": "^10.2.4",
    "glob": "^13.0.6"
  },
  "dependencies": {
    "@fastify/swagger": "^9.7.0",
    "@fastify/swagger-ui": "^5.2.5",
    "@fastify/type-provider-typebox": "^6.1.0",
    "@nats-io/jetstream": "^3.3.1",
    "@nats-io/transport-node": "^3.3.1",
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/auto-instrumentations-node": "^0.71.0",
    "@opentelemetry/sdk-node": "^0.213.0",
    "@simplewebauthn/server": "^13.2.3",
    "@sinclair/typebox": "^0.34.48",
    "fastify": "^5.7.4",
    "fastify-plugin": "^5.1.0",
    "jose": "^6.1.3",
    "nconf": "^0.13.0",
    "pg": "^8.18.0"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@types/eslint-config-prettier": "^6.11.3",
    "@types/nconf": "^0.10.7",
    "@types/node": "^25.3.0",
    "eslint": "^10.0.1",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-perfectionist": "^5.6.0",
    "eslint-plugin-prettier": "^5.5.5",
    "globals": "^17.3.0",
    "nodemon": "^3.1.14",
    "prettier": "^3.8.1"
  }
}
```

## domains/auth/auth-api/prettier.config.mjs
```
/**
 * @see https://prettier.io/docs/en/configuration.html
 * @type {import("./node_modules/prettier/index.d.ts").Config}
 */
export default {};

// https://github.com/prettier/prettier-vscode/issues/3378
```

## domains/auth/auth-api/src/api/jwks/index.mjs
```
import { exportJWK, importSPKI } from "jose";
import nconf from "nconf";
import { readFile } from "node:fs/promises";

const JWT_KID = "k1";

const jwk = await exportJWK(
  await importSPKI(
    await readFile(nconf.get("JWT_PUBLIC_KEY_PATH"), "utf-8"),
    "ES256",
  ),
);

/**
 * @param {import("fastify").FastifyInstance} fastify
 */
export default (fastify) => {
  fastify.get("/.well-known/jwks.json", async (_, reply) => {
    reply.header("Cache-Control", "public, max-age=300, immutable");

    return reply.code(200).send({
      keys: [{ ...jwk, alg: "ES256", kid: JWT_KID, use: "sig" }],
    });
  });
};
```

## domains/auth/auth-api/src/api/probes/index.mjs
```
/**
 * @param {import("fastify").FastifyInstance} fastify
 * @param {import("../../fastify.js").WithCtx} opts
 */
export default async (fastify, opts) => {
  const { ctx } = opts;

  fastify.get("/healthz", { logLevel: "silent" }, () => ({ ok: true }));
  fastify.get("/readyz", { logLevel: "silent" }, async (_, reply) => {
    try {
      await ctx.db.query("SELECT 1");

      // if (fastify.nc && fastify.nc.isClosed()) {
      //   throw new Error();
      // }

      return { ok: true };
    } catch {
      return reply.code(503).send({ ok: false });
    }
  });
};
```

## domains/auth/auth-api/src/api/versions/v1/index.mjs
```
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import passkeyRoutes from "./routes/passkeys/index.mjs";
import sessionRoutes from "./routes/sessions/index.mjs";

/**
 * @param {import('../../../fastify.js').FastifyInstance} fastify
 * @param {import("../../../fastify.js").WithRuntime} opts
 */
export default async (fastify, opts) => {
  const { runtime } = opts;

  await fastify.register(swagger, {
    openapi: {
      components: {
        securitySchemes: {
          bearerAuth: {
            bearerFormat: "JWT",
            scheme: "bearer",
            type: "http",
          },
        },
      },
      info: {
        title: "Authentication",
        version: "v1",
      },
      servers: [
        {
          url: "/auth",
        },
      ],
      tags: [
        {
          description: "Passkey registration and authentication flows",
          name: "passkeys",
        },
        {
          description: "Session lifecycle and token refresh",
          name: "sessions",
        },
      ],
    },
  });

  await fastify.register(swaggerUI, {
    routePrefix: "/docs",
  });

  await fastify.register(passkeyRoutes, {
    prefix: "/passkeys",
    runtime,
  });
  await fastify.register(sessionRoutes, {
    prefix: "/sessions",
    runtime,
  });
};
```

## domains/auth/auth-api/src/api/versions/v1/routes/passkeys/index.mjs
```
import loginChallenge from "./login.challenge.mjs";
import login from "./login.mjs";
import registerChallenge from "./register.challenge.mjs";
import register from "./register.mjs";

/**
 * @param {import('../../../../../fastify.js').FastifyInstance} fastify
 * @param {import('../../../../../fastify.js').WithRuntime} opts
 */
export default async function (fastify, opts) {
  const { runtime } = opts;

  await fastify.register(loginChallenge, { runtime });
  await fastify.register(login, { runtime });
  await fastify.register(registerChallenge, { runtime });
  await fastify.register(register, { runtime });
}
```

## domains/auth/auth-api/src/api/versions/v1/routes/passkeys/login.challenge.mjs
```
import { AuthenticationChallengeResponse } from "../../schemas.mjs";

/**
 * @param {import('../../../../../fastify.js').FastifyInstance} fastify
 * @param {import('../../../../../fastify.js').WithRuntime} opts
 */
export default async function (fastify, opts) {
  const { runtime } = opts;

  fastify.post(
    "/login/challenge",
    {
      schema: {
        description:
          "Generates a WebAuthn authentication challenge for passkey login",
        operationId: "createPasskeyLoginChallenge",
        response: {
          200: AuthenticationChallengeResponse,
        },
        summary: "Create authentication challenge",
        tags: ["passkeys"],
      },
    },
    async function (_, reply) {
      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      return reply.send({
        publicKey: await runtime.passkeys.createLoginChallenge(),
      });
    },
  );
}
```

## domains/auth/auth-api/src/api/versions/v1/routes/passkeys/login.mjs
```
import {
  ErrorResponse,
  LoginBody,
  LoginSuccessResponse,
} from "../../schemas.mjs";

/**
 * @param {import('../../../../../fastify.js').FastifyInstance} fastify
 * @param {import('../../../../../fastify.js').WithRuntime} opts
 */
export default async function (fastify, opts) {
  const { runtime } = opts;

  fastify.post(
    "/login",
    {
      schema: {
        body: LoginBody,
        description:
          "Verifies the WebAuthn authentication response and issues a refresh token if successful.",
        operationId: "loginWithPasskey",
        response: {
          200: LoginSuccessResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          500: ErrorResponse,
        },
        summary: "Finalize passkey login",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      try {
        reply.header("Cache-Control", "no-store");
        reply.header("Pragma", "no-cache");

        return reply.code(200).send(await runtime.passkeys.login(request.body));
      } catch (err) {
        const code = /** @type {Error} */ (err).message;

        if (
          code === "INVALID_CREDENTIAL" ||
          code === "INVALID_CLIENT_DATA" ||
          code === "INVALID_CHALLENGE"
        ) {
          return reply.code(400).send(null);
        }

        if (
          code === "CHALLENGE_NOT_FOUND" ||
          code === "CREDENTIAL_NOT_FOUND" ||
          code === "INVALID_USER_HANDLE" ||
          code === "VERIFICATION_FAILED" ||
          code === "NOT_VERIFIED" ||
          code === "COUNTER_REPLAY"
        ) {
          return reply.code(401).send(null);
        }

        return reply.code(500).send(null);
      }
    },
  );
}
```

## domains/auth/auth-api/src/api/versions/v1/routes/passkeys/register.challenge.mjs
```
import { RegistrationChallengeResponse } from "../../schemas.mjs";

/**
 * @param {import('../../../../../fastify.js').FastifyInstance} fastify
 * @param {import('../../../../../fastify.js').WithRuntime} opts
 */
export default async function (fastify, opts) {
  const { runtime } = opts;

  fastify.post(
    "/register/challenge",
    {
      schema: {
        description:
          "Generates a WebAuthn credential creation challenge used to register a new passkey.",
        operationId: "createPasskeyRegistrationChallenge",
        response: {
          200: RegistrationChallengeResponse,
        },
        summary: "Create passkey registration challenge",
        tags: ["passkeys"],
      },
    },
    async function (_, reply) {
      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      return reply
        .code(200)
        .send({ publicKey: await runtime.passkeys.createRegisterChallenge() });
    },
  );
}
```

## domains/auth/auth-api/src/api/versions/v1/routes/passkeys/register.mjs
```
import {
  ErrorResponse,
  RegistrationBody,
  RegistrationSuccessResponse,
} from "../../schemas.mjs";

/**
 * @param {import('../../../../../fastify.js').FastifyInstance} fastify
 * @param {import('../../../../../fastify.js').WithRuntime} opts
 */
export default async function (fastify, opts) {
  const { runtime } = opts;

  fastify.post(
    "/register",
    {
      schema: {
        body: RegistrationBody,
        description:
          "Verifies the WebAuthn registration response and stores the credential.",
        operationId: "registerPasskey",
        response: {
          201: RegistrationSuccessResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          409: ErrorResponse,
          500: ErrorResponse,
        },
        summary: "Finalize passkey registration",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      try {
        reply.header("Cache-Control", "no-store");
        reply.header("Pragma", "no-cache");

        return reply
          .code(201)
          .send(await runtime.passkeys.register(request.body));
      } catch (err) {
        const code = /** @type {Error} */ (err).message;

        if (
          code === "INVALID_CREDENTIAL" ||
          code === "INVALID_CLIENT_DATA" ||
          code === "INVALID_CHALLENGE" ||
          code === "INVALID_REGISTRATION_CREDENTIAL" ||
          code === "CREDENTIAL_ID_MISMATCH"
        ) {
          return reply.code(400).send(null);
        }

        if (
          code === "CHALLENGE_NOT_FOUND" ||
          code === "VERIFICATION_FAILED" ||
          code === "NOT_VERIFIED"
        ) {
          return reply.code(401).send(null);
        }

        if (code === "CREDENTIAL_ALREADY_EXISTS") {
          return reply.code(409).send(null);
        }

        return reply.code(500).send(null);
      }
    },
  );
}
```

## domains/auth/auth-api/src/api/versions/v1/routes/passkeys/shared.mjs
```
```

## domains/auth/auth-api/src/api/versions/v1/routes/sessions/index.mjs
```
import refresh from "./refresh.mjs";
import token from "./token.mjs";

/**
 * @param {import("../../../../../fastify.js").FastifyInstance} fastify
 * @param {import("../../../../../fastify.js").WithRuntime} opts
 */
export default async function (fastify, opts) {
  const { runtime } = opts;

  await fastify.register(refresh, { runtime });
  await fastify.register(token, { runtime });
}
```

## domains/auth/auth-api/src/api/versions/v1/routes/sessions/refresh.mjs
```
import { ErrorResponse, RefreshBody, RefreshResponse } from "../../schemas.mjs";

/**
 * @param {import("../../../../../fastify.js").FastifyInstance} fastify
 * @param {import("../../../../../fastify.js").WithRuntime} opts
 */
export default async function (fastify, opts) {
  const { runtime } = opts;

  fastify.post(
    "/refresh",
    {
      schema: {
        body: RefreshBody,
        description: "Exchanges a valid refresh token for a new refresh token.",
        operationId: "refreshSession",
        response: {
          200: RefreshResponse,
          401: ErrorResponse,
          500: ErrorResponse,
        },
        summary: "Refresh session",
        tags: ["sessions"],
      },
    },
    async function (request, reply) {
      try {
        reply.header("Cache-Control", "no-store");

        return reply.send(await runtime.sessions.refresh(request.body));
      } catch (err) {
        const code = /** @type {Error} */ (err).message;

        if (code === "INVALID_REFRESH_TOKEN" || code === "SESSION_NOT_FOUND") {
          return reply.code(401).send(null);
        }

        return reply.code(500).send(null);
      }
    },
  );
}
```

## domains/auth/auth-api/src/api/versions/v1/routes/sessions/token.mjs
```
import {
  ErrorResponse,
  SessionTokenBody,
  SessionTokenResponse,
} from "../../schemas.mjs";

/**
 * @param {import("../../../../../fastify.js").FastifyInstance} fastify
 * @param {import("../../../../../fastify.js").WithRuntime} opts
 */
export default async function (fastify, opts) {
  const { runtime } = opts;

  fastify.post(
    "/token",
    {
      schema: {
        body: SessionTokenBody,
        description:
          "Exchange a refresh token for a short-lived audience-scoped access token.",
        operationId: "exchangeSessionToken",
        response: {
          200: SessionTokenResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          500: ErrorResponse,
        },
        summary: "Mint access token",
        tags: ["sessions"],
      },
    },
    async function (req, reply) {
      const [type, token] = (req.headers.authorization || "").split(" ");

      if (type !== "Bearer" || !token) {
        return reply.code(401).send(null);
      }

      try {
        reply.header("Cache-Control", "no-store");

        return reply.send(
          await runtime.sessions.createAccessToken({
            audience: req.body.audience,
            refresh_token: token,
          }),
        );
      } catch (err) {
        const code = /** @type {Error} */ (err).message;

        if (code === "INVALID_REFRESH_TOKEN" || code === "SESSION_NOT_FOUND") {
          return reply.code(401).send(null);
        }

        if (code === "INVALID_AUDIENCE") {
          return reply.code(403).send(null);
        }

        return reply.code(500).send(null);
      }
    },
  );
}
```

## domains/auth/auth-api/src/api/versions/v1/schemas.mjs
```
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

export const SessionTokenBody = Type.Object(
  {
    audience: Type.String({
      maxLength: 128,
      minLength: 1,
    }),
  },
  { additionalProperties: false },
);

export const SessionTokenResponse = Type.Object(
  {
    access_token: Type.String(),
    expires_in: Type.Integer(),
  },
  { additionalProperties: false },
);

export const ErrorResponse = Type.Null();
export const EmptyResponse = Type.Null();
```

## domains/auth/auth-api/src/api/versions/v2/.gitkeep
```
```

## domains/auth/auth-api/src/context.mjs
```
import { jetstream, jetstreamManager } from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";
import nconf from "nconf";
import { Pool } from "pg";

export const createNatsContext = async () => {
  const nc = await connect({
    name: "auth-api",
    servers: nconf.get("NATS_URL"),
  });

  const jsm = await jetstreamManager(nc);

  // max_bytes, retention, and discard
  // work together to define how
  // your stream behaves when it reaches capacity.
  try {
    await jsm.streams.add({
      discard: "old",
      max_bytes: Math.pow(1024, 3) * 1, // 1GiB
      name: "auth",
      num_replicas: 3,
      retention: "limits",
      storage: "file",
      subjects: ["auth.>"],
    });
  } catch {
    //
  }

  return {
    close: () => (nc.isClosed() ? Promise.resolve() : nc.drain()),
    js: jetstream(nc),
  };
};

const createPgContext = () => {
  const pool = new Pool({
    connectionString: nconf.get("DATABASE_URL"),
    connectionTimeoutMillis: 2000,
    // https://node-postgres.com/apis/pool
    // max_connections on postgres = 100,
    //  minus 20 for other services = 80
    //  budget for auth-api = 80 * 75% = 60
    //  per auth-api replica = 60 / 3 replicas = 20
    max: 20,
  });

  return {
    close: () => pool.end(),
    db: pool,
  };
};

export const createContext = async () => {
  const pg = createPgContext();
  // const nats = await createNatsContext();

  return {
    // close: () => Promise.allSettled([pg.close(), nats.close()]),
    close: () => Promise.allSettled([pg.close()]),
    conf: {
      jwtPrivateKeyPath: nconf.get("JWT_PRIVATE_KEY_PATH"),
      jwtPublicKeyPath: nconf.get("JWT_PUBLIC_KEY_PATH"),
      origin: nconf.get("ORIGIN"),
    },
    db: pg.db,
    // js: nats.js,
    // region: nconf.get("REGION") ?? "dev", // CHANGE THIS
  };
};
```

## domains/auth/auth-api/src/fastify.d.ts
```
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import type {
  FastifyBaseLogger,
  FastifyInstance as Instance,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from "fastify";
import type { Pool } from "pg";

export interface Runtime {
  passkeys: {
    createLoginChallenge: () => Promise<PublicKeyCredentialRequestOptionsJSON>;
    createRegisterChallenge: () => Promise<PublicKeyCredentialCreationOptionsJSON>;
    login: (args: {
      authentication: AuthenticationResponseJSON;
    }) => Promise<{ refresh_token: string }>;
    register: (args: {
      credential: RegistrationResponseJSON;
    }) => Promise<{ refresh_token: string }>;
  };
  sessions: {
    refresh: (args: {
      refresh_token: string;
    }) => Promise<{ refresh_token: string }>;
    createAccessToken: (args: {
      refresh_token: string;
      audience: string;
    }) => Promise<{ access_token: string; expires_in: number }>;
  };
}

interface Ctx {
  db: Pool;
  conf: {
    origin: string;
    jwtPrivateKeyPath: string;
    jwtPublicKeyPath: string;
  };
  close: () => Promise<[PromiseSettledResult<void>]>;
}

export interface WithCtx {
  ctx: Ctx;
}

export interface WithRuntime {
  runtime: Runtime;
}

export type FastifyInstance = Instance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;
```

## domains/auth/auth-api/src/index.mjs
```
import nconf from "nconf";

nconf
  .env()
  .required([
    "DATABASE_URL",

    "JWT_PRIVATE_KEY_PATH",
    "JWT_PUBLIC_KEY_PATH",

    "NATS_URL",

    "ORIGIN",
  ]);

var origin = nconf.get("ORIGIN");

try {
  new URL(origin);
} catch {
  throw new Error(`Invalid ORIGIN: ${origin}`);
}

import("./server.mjs");
```

## domains/auth/auth-api/src/otel.mjs
```
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { NodeSDK } from "@opentelemetry/sdk-node";

const sdk = new NodeSDK({
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-dns": { enabled: false },
      "@opentelemetry/instrumentation-fs": { enabled: false },
      "@opentelemetry/instrumentation-http": {
        ignoreIncomingRequestHook: (req) =>
          req.url === "/healthz" || req.url === "/readyz",
      },
      "@opentelemetry/instrumentation-net": { enabled: false },
      "@opentelemetry/instrumentation-pg": { enabled: false },
    }),
  ],
});

sdk.start();

console.log("otel started");
```

## domains/auth/auth-api/src/runtime/index.mjs
```
import { createPasskeysRuntime } from "./passkeys/index.mjs";
import { createSessionsRuntime } from "./sessions/index.mjs";

/**
 * @param {import('../fastify.js').Ctx} ctx
 * @returns {import('../fastify.js').Runtime}
 */
export const createRuntime = (ctx) => ({
  passkeys: createPasskeysRuntime(ctx),
  sessions: createSessionsRuntime(ctx),
});
```

## domains/auth/auth-api/src/runtime/passkeys/index.mjs
```
import { createLoginChallenge } from "./login.challenge.mjs";
import { login } from "./login.mjs";
import { createRegisterChallenge } from "./register.challenge.mjs";
import { register } from "./register.mjs";

/**
 * @param {import('../../fastify.js').Ctx} ctx
 */
export const createPasskeysRuntime = (ctx) => ({
  createLoginChallenge: () => createLoginChallenge(ctx),
  createRegisterChallenge: () => createRegisterChallenge(ctx),
  login: login(ctx),
  register: register(ctx),
});
```

## domains/auth/auth-api/src/runtime/passkeys/login.challenge.mjs
```
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { randomBytes } from "node:crypto";

/**
 * @param {import('../../fastify.js').Ctx} ctx
 * @returns {Promise<import("@simplewebauthn/server").PublicKeyCredentialRequestOptionsJSON>}
 */
export const createLoginChallenge = async (ctx) => {
  const challenge = randomBytes(32);

  await ctx.db.query(
    `
      INSERT INTO challenges (user_id, challenge)
      VALUES (NULL, $1)
    `,
    [challenge],
  );

  return generateAuthenticationOptions({
    challenge,
    rpID: new URL(ctx.conf.origin).hostname,
    userVerification: "required",
  });
};
```

## domains/auth/auth-api/src/runtime/passkeys/login.mjs
```
import { verifyAuthenticationResponse } from "@simplewebauthn/server";

import { generateRefreshToken } from "../shared.mjs";

/**
 * @typedef {import("@simplewebauthn/server").AuthenticationResponseJSON} AuthenticationResponseJSON
 */

/**
 * @typedef {Object} LoginInput
 * @property {AuthenticationResponseJSON} authentication
 */

/**
 * @param {import('../../fastify.js').Ctx} ctx
 * @returns {(input: LoginInput) => Promise<{refresh_token: string}>}
 */
export const login =
  (ctx) =>
  async ({ authentication }) => {
    const { conf, db } = ctx;

    const { hostname, origin } = new URL(conf.origin);

    if (authentication.id !== authentication.rawId) {
      throw new Error("INVALID_CREDENTIAL");
    }

    let clientDataJSON;

    try {
      clientDataJSON = JSON.parse(
        Buffer.from(
          authentication.response.clientDataJSON,
          "base64url",
        ).toString("utf8"),
      );
    } catch {
      throw new Error("INVALID_CLIENT_DATA");
    }

    if (
      !clientDataJSON ||
      typeof clientDataJSON !== "object" ||
      typeof clientDataJSON.challenge !== "string"
    ) {
      throw new Error("INVALID_CLIENT_DATA");
    }

    let challengeBytes;

    try {
      challengeBytes = Buffer.from(clientDataJSON.challenge, "base64url");
    } catch {
      throw new Error("INVALID_CHALLENGE");
    }

    const {
      rows: [challengeRow],
    } = await db.query(
      `
        DELETE FROM challenges
        WHERE challenge = $1
          AND user_id IS NULL
          AND expires_at > NOW()
        RETURNING challenge
      `,
      [challengeBytes],
    );

    if (!challengeRow) {
      throw new Error("CHALLENGE_NOT_FOUND");
    }

    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const {
        rows: [credential],
      } = await client.query(
        `
          SELECT user_id, credential_id, public_key, sign_count
          FROM credentials
          WHERE credential_id = $1
          FOR UPDATE
        `,
        [Buffer.from(authentication.id, "base64url")],
      );

      if (!credential) {
        throw new Error("CREDENTIAL_NOT_FOUND");
      }

      if (authentication.response.userHandle) {
        const userHandle = Buffer.from(
          authentication.response.userHandle,
          "base64url",
        );

        const expectedHandle = Buffer.from(
          credential.user_id.replace(/-/g, ""),
          "hex",
        );

        if (!userHandle.equals(expectedHandle)) {
          throw new Error("INVALID_USER_HANDLE");
        }
      }

      let verification;

      try {
        verification = await verifyAuthenticationResponse({
          credential: {
            counter: Number(credential.sign_count),
            id: credential.credential_id.toString("base64url"),
            publicKey: new Uint8Array(credential.public_key),
          },
          expectedChallenge: challengeRow.challenge.toString("base64url"),
          expectedOrigin: origin,
          expectedRPID: hostname,
          requireUserVerification: true,
          response: authentication,
        });
      } catch {
        throw new Error("VERIFICATION_FAILED");
      }

      if (!verification.verified) {
        throw new Error("NOT_VERIFIED");
      }

      const newCounter = verification.authenticationInfo.newCounter;
      const oldCounter = Number(credential.sign_count);

      if (newCounter > 0 && newCounter <= oldCounter) {
        throw new Error("COUNTER_REPLAY");
      }

      await client.query(
        `
          UPDATE credentials
          SET sign_count =
            CASE
              WHEN $2 > sign_count THEN $2
              ELSE sign_count
            END
          WHERE credential_id = $1
        `,
        [credential.credential_id, newCounter],
      );

      const { hash, token } = generateRefreshToken();

      await client.query(
        `
          INSERT INTO sessions 
          (
            user_id,
            refresh_token_hash,
            expires_at
          )
          VALUES ($1, $2, NOW() + INTERVAL '30 days')
        `,
        [credential.user_id, hash],
      );

      await client.query("COMMIT");

      return {
        refresh_token: token,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  };
```

## domains/auth/auth-api/src/runtime/passkeys/register.challenge.mjs
```
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { randomBytes, randomUUID } from "node:crypto";

/**
 * @param {import('../../fastify.js').Ctx} ctx
 * @returns {Promise<import("@simplewebauthn/server").PublicKeyCredentialCreationOptionsJSON>}
 */
export const createRegisterChallenge = async (ctx) => {
  const userId = randomUUID();

  const webauthnUserHandle = Buffer.from(userId.replace(/-/g, ""), "hex");
  const challenge = randomBytes(32);

  await ctx.db.query(
    `
      INSERT INTO challenges (user_id, challenge)
      VALUES ($1, $2)
    `,
    [userId, challenge],
  );

  const { hostname } = new URL(ctx.conf.origin);

  return generateRegistrationOptions({
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
    challenge,
    rpID: hostname,
    rpName: hostname,
    timeout: 60000,
    userID: webauthnUserHandle,
    userName: "",
  });
};
```

## domains/auth/auth-api/src/runtime/passkeys/register.mjs
```
import { verifyRegistrationResponse } from "@simplewebauthn/server";

import { generateRefreshToken } from "../shared.mjs";

/**
 * @typedef {import("@simplewebauthn/server").RegistrationResponseJSON} RegistrationResponseJSON
 */

/**
 * @typedef {Object} RegisterInput
 * @property {RegistrationResponseJSON} credential
 */

/**
 * @param {import('../../fastify.js').Ctx} ctx
 * @returns {(input: RegisterInput) => Promise<{refresh_token: string}>}
 */
export const register =
  (ctx) =>
  async ({ credential }) => {
    const { conf, db } = ctx;

    const { hostname, origin } = new URL(conf.origin);

    if (credential.id !== credential.rawId) {
      throw new Error("INVALID_CREDENTIAL");
    }

    let clientDataJSON;

    try {
      clientDataJSON = JSON.parse(
        Buffer.from(credential.response.clientDataJSON, "base64url").toString(
          "utf8",
        ),
      );
    } catch {
      throw new Error("INVALID_CLIENT_DATA");
    }

    if (
      !clientDataJSON ||
      typeof clientDataJSON !== "object" ||
      typeof clientDataJSON.challenge !== "string"
    ) {
      throw new Error("INVALID_CLIENT_DATA");
    }

    let challengeBytes;

    try {
      challengeBytes = Buffer.from(clientDataJSON.challenge, "base64url");
    } catch {
      throw new Error("INVALID_CHALLENGE");
    }

    const {
      rows: [challengeRow],
    } = await db.query(
      `
        DELETE FROM challenges
        WHERE challenge = $1
          AND user_id IS NOT NULL
          AND expires_at > NOW()
        RETURNING user_id, challenge
      `,
      [challengeBytes],
    );

    if (!challengeRow?.user_id || !challengeRow?.challenge) {
      throw new Error("CHALLENGE_NOT_FOUND");
    }

    const expectedChallenge = challengeRow.challenge.toString("base64url");

    let verification;

    try {
      verification = await verifyRegistrationResponse({
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: hostname,
        requireUserVerification: true,
        response: {
          ...credential,
          clientExtensionResults: credential.clientExtensionResults ?? {},
        },
      });
    } catch {
      throw new Error("VERIFICATION_FAILED");
    }

    if (!verification?.verified || !verification.registrationInfo?.credential) {
      throw new Error("NOT_VERIFIED");
    }

    const registrationCredential = verification.registrationInfo.credential;

    if (
      typeof registrationCredential.id !== "string" ||
      !registrationCredential.publicKey
    ) {
      throw new Error("INVALID_REGISTRATION_CREDENTIAL");
    }

    if (credential.id !== registrationCredential.id) {
      throw new Error("CREDENTIAL_ID_MISMATCH");
    }

    const credentialId = Buffer.from(registrationCredential.id, "base64url");
    const publicKey = Buffer.from(registrationCredential.publicKey);
    const signCount = registrationCredential.counter;

    const client = await db.connect();

    try {
      await client.query("BEGIN");

      /** @type {string} */
      const userId = challengeRow.user_id;

      await client.query(
        `
          INSERT INTO users (id)
          VALUES ($1)
          ON CONFLICT DO NOTHING
        `,
        [userId],
      );

      await client.query(
        `
          INSERT INTO credentials
          (
            user_id,
            credential_id,
            public_key,
            sign_count
          )
          VALUES ($1, $2, $3, $4)
        `,
        [userId, credentialId, publicKey, signCount],
      );

      const { hash, token } = generateRefreshToken();

      await client.query(
        `
          INSERT INTO sessions 
          (
            user_id,
            refresh_token_hash,
            expires_at
          )
          VALUES ($1, $2, NOW() + INTERVAL '30 days')
        `,
        [userId, hash],
      );

      await client.query("COMMIT");

      return {
        refresh_token: token,
      };
    } catch (err) {
      await client.query("ROLLBACK");

      /** @type {any} */
      const error = err;

      if (error?.code === "23505") {
        throw new Error("CREDENTIAL_ALREADY_EXISTS", {
          cause: err,
        });
      }

      throw err;
    } finally {
      client.release();
    }
  };
```

## domains/auth/auth-api/src/runtime/sessions/index.mjs
```
import { refresh } from "./refresh.mjs";
import { createAccessToken } from "./token.mjs";

/**
 * @param {import("../../fastify.js").Ctx} ctx
 */
export const createSessionsRuntime = (ctx) => ({
  createAccessToken: createAccessToken(ctx),
  refresh: refresh(ctx),
});
```

## domains/auth/auth-api/src/runtime/sessions/refresh.mjs
```
import { createHash } from "node:crypto";

import { generateRefreshToken } from "../shared.mjs";

/**
 * @param {import("../../fastify.js").Ctx} ctx
 * @returns {(args: { refresh_token: string }) => Promise<{ refresh_token: string }>}
 */
export const refresh =
  (ctx) =>
  async ({ refresh_token }) => {
    if (!refresh_token || typeof refresh_token !== "string") {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    const client = await ctx.db.connect();

    try {
      await client.query("BEGIN");

      const {
        rows: [session],
      } = await client.query(
        `
          SELECT id, user_id
          FROM sessions
          WHERE refresh_token_hash = $1
            AND revoked_at IS NULL
            AND expires_at > NOW()
          FOR UPDATE
        `,
        [createHash("sha256").update(refresh_token).digest()],
      );

      if (!session) {
        throw new Error("SESSION_NOT_FOUND");
      }

      const { hash, token } = generateRefreshToken();

      await client.query(
        `
          UPDATE sessions
          SET
            refresh_token_hash = $2,
            last_refreshed_at = NOW()
          WHERE id = $1
        `,
        [session.id, hash],
      );

      await client.query("COMMIT");

      return {
        refresh_token: token,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  };
```

## domains/auth/auth-api/src/runtime/sessions/token.mjs
```
import { importPKCS8, SignJWT } from "jose";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const TTL_SECONDS = 60;
const REUSE_WINDOW_MS = 10_000;
const MAX_CACHE = 10_000;

const ALLOWED_AUDIENCES = new Set([
  "ai-inference",
  "auth",
  "billing",
  "profile",
  "uploads",
]);

/**
 * @typedef {Object} ProjectionCacheEntry
 * @property {string} token
 * @property {number} exp
 */

/** @type {Map<string, ProjectionCacheEntry>} */
const cache = new Map();
/** @type {Map<string, Promise<ProjectionCacheEntry>>} */
const inflight = new Map();

/**
 * @param {string} key
 * @param {ProjectionCacheEntry} value
 */
function cacheSet(key, value) {
  if (cache.size >= MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }

  cache.set(key, value);
}

/**
 * @param {import("../../fastify.js").Ctx} ctx
 * @returns {(args: { refresh_token: string; audience: string }) => Promise<{ access_token: string; expires_in: number }>}
 */
export const createAccessToken = (ctx) => {
  const privateKeyPromise = importPKCS8(
    readFileSync(ctx.conf.jwtPrivateKeyPath, "utf8"),
    "ES256",
  );

  return async ({ audience, refresh_token }) => {
    if (!refresh_token || typeof refresh_token !== "string") {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    if (!ALLOWED_AUDIENCES.has(audience)) {
      throw new Error("INVALID_AUDIENCE");
    }

    const {
      rows: [session],
    } = await ctx.db.query(
      `
        SELECT id, user_id, last_refreshed_at
        FROM sessions
        WHERE refresh_token_hash = $1
          AND revoked_at IS NULL
          AND expires_at > NOW()
      `,
      [createHash("sha256").update(refresh_token).digest()],
    );

    if (!session) {
      throw new Error("SESSION_NOT_FOUND");
    }

    const version = new Date(session.last_refreshed_at).toISOString();
    const cacheKey = `${session.id}:${version}:${audience}`;
    const cached = cache.get(cacheKey);

    if (cached && cached.exp > Date.now()) {
      return {
        access_token: cached.token,
        expires_in: TTL_SECONDS,
      };
    }

    let pending = inflight.get(cacheKey);

    if (!pending) {
      pending = (async () => {
        const now = Math.floor(Date.now() / 1000);
        const privateKey = await privateKeyPromise;

        const token = await new SignJWT({
          sub: session.user_id,
        })
          .setProtectedHeader({
            alg: "ES256",
            kid: "k1",
            typ: "at+jwt",
          })
          .setIssuer("ISSUER")
          .setAudience(audience)
          .setIssuedAt(now)
          .setExpirationTime(now + TTL_SECONDS)
          .sign(privateKey);

        const entry = {
          exp: Date.now() + REUSE_WINDOW_MS,
          token,
        };

        cacheSet(cacheKey, entry);

        return entry;
      })().finally(() => {
        inflight.delete(cacheKey);
      });

      inflight.set(cacheKey, pending);
    }

    const entry = await pending;

    return {
      access_token: entry.token,
      expires_in: TTL_SECONDS,
    };
  };
};
```

## domains/auth/auth-api/src/server.mjs
```
import { TypeBoxValidatorCompiler } from "@fastify/type-provider-typebox";
import Fastify from "fastify";

import jwks from "./api/jwks/index.mjs";
import probes from "./api/probes/index.mjs";
import v1 from "./api/versions/v1/index.mjs";
import { createContext } from "./context.mjs";
import { createRuntime } from "./runtime/index.mjs";

const ctx = await createContext();
const runtime = createRuntime(ctx);

const fastify = Fastify({
  logger: {
    level: "debug",
  },
});

/**
 * @type {import('./fastify.js').FastifyInstance}
 */
const app = fastify
  .setValidatorCompiler(TypeBoxValidatorCompiler)
  .withTypeProvider();

await app.register(probes, { ctx });
await app.register(jwks);
await app.register(v1, { prefix: "/v1", runtime });

app.addHook("onClose", () => ctx.close());

await app.ready();

await app.listen({
  port: 3000,
});
```

## domains/auth/auth-ui/.gitignore
```
# React Router
/.react-router/
/build/
```

## domains/auth/auth-ui/package.json
```
{
  "name": "auth-ui",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "react-router build",
    "dev": "react-router dev",
    "start": "react-router-serve ./build/server/index.js",
    "typecheck": "react-router typegen && tsc"
  },
  "dependencies": {
    "@react-router/node": "7.12.0",
    "@react-router/serve": "7.12.0",
    "@simplewebauthn/browser": "^13.3.0",
    "isbot": "^5",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-router": "7.12.0"
  },
  "devDependencies": {
    "@react-router/dev": "7.12.0",
    "@tailwindcss/vite": "^4.1.13",
    "@types/node": "^22",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "tailwindcss": "^4.1.13",
    "typescript": "^5.9.2",
    "vite": "^7.1.7",
    "vite-tsconfig-paths": "^5.1.4"
  }
}
```

## domains/auth/auth-ui/public/favicon.ico
```
    00     ¨%  6          ¨  Ş%       h  †6  (   0   `           $                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           ÒÑÒ                                                                                               `   ®   Ã   ª   W   	                                                    ĞĞ{Ğ¸ĞÂĞĞCÒ                                                   	   W   ª   Ã   ®   `             •   ù   ÿ   ÿ   ÿ   ö   ˆ                                               Ñ)ĞÄĞşĞÿĞÿĞÿĞìĞg Ô                                              ˆ   ö   ÿ   ÿ   ÿ   ù   •      n   ÷   ÿ   ÿ   ÿ   ÿ   ÿ   ô   R                                        ÑĞ¢ĞÿĞÿĞÿĞÿĞÿĞÿĞäÑ4                                           R   ô   ÿ   ÿ   ÿ   ÿ   ÿ   ÷   n   Ç   ÿ   ÿ   ÿ   ÿ   ÿ   ÿ   ÿ                                          Ñ(ĞäĞÿĞÿĞÿĞÿĞÿĞÿĞÿĞ                                             ÿ   ÿ   ÿ   ÿ   ÿ   ÿ   ÿ   Ç   ß   ÿ   ÿ   ÿ   ÿ   ÿ   ÿ   ÿ   µ                                       Ğ;ĞòĞÿĞÿĞÿĞÿĞÿĞÿĞÿĞÅÒ                                      µ   ÿ   ÿ   ÿ   ÿ   ÿ   ÿ   ÿ   ß   Ä   ÿ   ÿ   ÿ   ÿ   ÿ   ÿ   ÿ   œ                                       Ñ'ĞäĞÿĞÿĞÿĞÿĞÿĞÿĞÿĞáÑ#                                      œ   ÿ   ÿ   ÿ   ÿ   ÿ   ÿ   ÿ   Ä   i   õ   ÿ   ÿ   ÿ   ÿ   ÿ   ò   M                                        ÒĞŸĞÿĞÿĞÿĞÿĞÿĞÿĞÿĞ÷ÑN                                       M   ò   ÿ   ÿ   ÿ   ÿ   ÿ   õ   i      Œ   ÷   ÿ   ÿ   ÿ   ó   €                                               Ñ%Ğ½ĞşĞÿĞÿĞÿĞÿĞÿĞÿĞºÑ#                                      €   ó   ÿ   ÿ   ÿ   ÷   Œ          
   V   ¤   º   Ÿ   N                         !   :   .                   ÑĞtĞ¾ĞŞĞëĞõĞşĞÿĞşĞÔĞ•ĞyĞhÑJÑÒ                  N   Ÿ   º   ¤   V   
                                                   Œ   Ş   ò   ê   µ   =                    ÑÑĞ.Ğ@ĞuĞÚĞÿĞÿĞÿĞÿĞÿĞøĞÙĞwÑ                                                                                   ¤   ÿ   ÿ   ÿ   ÿ   ÿ   Ü   6                                    ÑHĞïĞÿĞÿĞÿĞÿĞÿĞÿĞûĞ…Ñ                                                                               S   ÷   ÿ   ÿ   ÿ   ÿ   ÿ   ÿ   ¡                                   ÒĞÅĞÿĞÿĞÿĞÿĞÿĞÿĞÿĞéĞ4                                                                                  ÿ   ÿ   ÿ   ÿ   ÿ   ÿ   ÿ   Ö                                    ÔĞ¦ĞÿĞÿĞÿĞÿĞÿĞÿĞÿĞÿĞi                                                                               ”   ÿ   ÿ   ÿ   ÿ   ÿ   ÿ   ÿ   Û                                   ÓĞ¨ĞÿĞÿĞÿĞÿĞÿĞÿĞÿĞÿĞq                                                                               f   ı   ÿ   ÿ   ÿ   ÿ   ÿ   ÿ   µ   	                                ÑĞÉĞÿĞÿĞÿĞÿĞÿĞÿĞÿĞôÑD                                                                                  Æ   ÿ   ÿ   ÿ   ÿ   ÿ   ñ   S                                    Ñ?ĞîĞÿĞÿĞÿĞÿĞÿĞÿĞÿĞªÒ                                                                                   4   ¾   ù   ÿ   ş   ß   h                       ÒÑÑÑBĞÅĞÿĞÿĞÿĞÿĞÿĞÿĞöĞªÑ!                                                                                              M   o   _   '               ÒÑ>Ğ‚Ğ­Ğ¾ĞĞĞğĞÿĞÿĞñĞÏĞ¹Ğ¦Ñ†ÑIÑ                                                                                                                            ÑĞĞğĞÿĞÿĞÿĞÿĞÿĞÿĞÊÑEÑÑÒ                                                                                                                                    %ÕĞ~ĞüĞÿĞÿĞÿĞÿĞÿĞÿĞ÷ÑO                                                                                                                                                    ÑĞÙĞÿĞÿĞÿĞÿĞÿĞÿĞÿĞßÑ                                                                                                                                                     Ğ9ĞñĞÿĞÿĞÿĞÿĞÿĞÿĞÿĞÆÑ                                                                                                                                                    Ğ0ĞëĞÿĞÿĞÿĞÿĞÿĞÿĞÿĞ™Õ                                                                                                                                                    ÑĞ»ĞÿĞÿĞÿĞÿĞÿĞÿĞòÑI                                                                                                                                                            ÑGĞãĞÿĞÿĞÿĞÿĞüĞÒ                                                                                                                                                            ÔĞBĞ²ĞãĞéĞÏĞtÑ                                                                                                                                                                        Ñ
Ñ$Ğ,ÑÒ                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    ÿÿÿÿÿÿ  ÿÿÿÿÿÿ  ÿÿÿÿÿÿ  ÿÿÿÿÿÿ  ÿÿÿÿÿÿ  ÿÿÿÿÿÿ  ÿÿÿÿÿÿ  ÿÿÿÿÿÿ  ÿÿÿÿÿÿ  ÿÿÿÿÿÿ  ÿÿÿÿÿÿ  ãÿş?ÿÇ  €ÿøÿ  €ÿğÿ   ğş    ğş    ğş   €ÿğÿ  €ÿøÿ  ãÿş ÿÇ  ÿğğÿ  ÿà?øÿ  ÿàøÿ  ÿÀøÿ  ÿÀøÿ  ÿàøÿ  ÿà?øÿ  ÿğğÿ  ÿÿş ÿ  ÿÿøÿÿ  ÿÿøÿÿ  ÿÿğÿÿ  ÿÿğÿÿ  ÿÿğÿÿ  ÿÿğÿÿ  ÿÿøÿÿ  ÿÿü?ÿÿ  ÿÿÿÿÿÿ  ÿÿÿÿÿÿ  ÿÿÿÿÿÿ  ÿÿÿÿÿÿ  ÿÿÿÿÿÿ  ÿÿÿÿÿÿ  ÿÿÿÿÿÿ  ÿÿÿÿÿÿ  ÿÿÿÿÿÿ  ÿÿÿÿÿÿ  ÿÿÿÿÿÿ  (       @                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   7      }   3                                   Ğ,ĞxĞ„ĞDÑ                                  3   }      7      V   ä   ÿ   ÿ   à   C                            Ğ8ĞÙĞÿĞÿĞğĞg                               C   à   ÿ   ÿ   ä   V   Î   ÿ   ÿ   ÿ   ÿ   ª                       ÒĞĞÿĞÿĞÿĞÿĞ×Ñ                          ª   ÿ   ÿ   ÿ   ÿ   Î   ç   ÿ   ÿ   ÿ   ÿ   Â                       ÑĞ·ĞÿĞÿĞÿĞÿĞùĞK                          Â   ÿ   ÿ   ÿ   ÿ   ç   ¬   ÿ   ÿ   ÿ   ÿ   Œ                            Ğ€ĞÿĞÿĞÿĞÿĞÿĞy                           Œ   ÿ   ÿ   ÿ   ÿ   ¬   (   ®   ï   î   ©                            ÑĞŸĞïĞşĞÿĞÿĞØĞNĞÑÒ              ©   î   ï   ®   (          4   2                 u   ¶   ¦   F       Ñ	Ğ7Ğ]ĞtĞ¯ĞøĞõĞàĞÒĞ¨ĞCÓ          2   4                                     Œ   ı   ÿ   ÿ   æ   ?                    ÑĞ²ĞÿĞÿĞÿĞÿĞãĞ:                                                       Ş   ÿ   ÿ   ÿ   ÿ   ‘                        ĞzĞÿĞÿĞÿĞÿĞÿĞ‹                                                   $   ã   ÿ   ÿ   ÿ   ÿ   ˜                        Ğ|ĞÿĞÿĞÿĞÿĞÿĞ“                                                      ¢   ÿ   ÿ   ÿ   ò   P                    Ñ	Ğ°ĞÿĞÿĞÿĞÿĞğĞJ                                                          ™   Ö   È   e       ÒÑĞ7ĞIĞĞõĞşĞõĞìĞËĞaÒ                                                                        ÑĞ}ĞØĞñĞùĞÿĞàĞoĞ?Ğ.ÑÓ                                                                                ĞmĞûĞÿĞÿĞÿĞÿĞy                                                                                                ÑĞ³ĞÿĞÿĞÿĞÿĞùĞJ                                                                                                ÑĞ¨ĞÿĞÿĞÿĞÿĞßĞ$                                                                                                    ĞLĞëĞÿĞÿĞúĞÓ                                                                                                    ÒĞGĞŸĞªĞeÑ                                                                                                                ÒÑ                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            ÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿ‡ü?áøÀøÀøÀ‡üáÿŸÀÿşàşğ?şğ?şàÿÀÿÿşÿÿüÿÿøÿÿøÿÿü?ÿÿşÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿ(                                                                                                                                                                                                                                          D               ÑĞ3Ğ;Ğ                  D      Á   û   ¥           Ğ?ĞæĞñĞ[              ¥   û   Á   ã   ÿ   Ã           ĞTĞúĞÿĞ©Ñ          Ã   ÿ   ã   I   Š   =      Q   CÑqĞ­ĞÎĞ”ĞfÕ   <   Š   I               e   ú   ì   =        Ğ\ĞüĞÿĞÑ                       l   ş   ò   B        ĞYĞüĞÿĞ§Ñ                          c   S{Ñ^Ğ˜ĞÉĞ§Ğ{Ğ$                                    ĞOĞ÷ĞÿĞ©Ñ                                            ĞEĞïĞøĞc                                                ĞĞBĞKĞ
                                                                                                                                                                                                                        ÿÿ  ÿÿ  ÿÿ  ÿÿ  x  8  ¿  óÇ  óÇ  ÿ  ş?  ş  ÿÿ  ÿÿ  ÿÿ  ÿÿ  ```

## domains/auth/auth-ui/react-router.config.ts
```
import type { Config } from "@react-router/dev/config";

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  appDirectory: "src",
} satisfies Config;
```

## domains/auth/auth-ui/src/app.css
```
@import "tailwindcss";
```

## domains/auth/auth-ui/src/root.tsx
```
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Error";
  let details = "Something went wrong.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404 ? "Page not found." : error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="h-screen flex flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-2xl font-semibold">{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="max-w-full overflow-x-auto text-left text-sm">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
```

## domains/auth/auth-ui/src/routes.ts
```
import { type RouteConfig, route } from "@react-router/dev/routes";

export default [
  route("/login", "./routes/login.tsx"),
  route("/login/challenge", "./routes/login.challenge.ts"),

  route("/register", "./routes/register.tsx"),
  route("/register/challenge", "./routes/register.challenge.ts"),
] satisfies RouteConfig;```

## domains/auth/auth-ui/src/routes/login.challenge.ts
```
export async function action() {
  const upstream = await fetch(
    "http://traefik-srv/auth/webauthn/authentication/challenge",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
  );

  const body = await upstream.text();

  return new Response(body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}
```

## domains/auth/auth-ui/src/routes/login.tsx
```
import {
  startAuthentication,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";

export async function action({ request }: { request: Request }) {
  const body = (await request.json()) as {
    authentication: AuthenticationResponseJSON;
  };

  const upstream = await fetch(
    "http://traefik-srv/auth/webauthn/authentication",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

async function handleLogin() {
  try {
    const res = await fetch("/login/challenge", {
      method: "POST",
    });

    if (!res.ok) {
      console.error("Auth challenge failed");
      return;
    }

    const { publicKey } = (await res.json()) as {
      publicKey: PublicKeyCredentialRequestOptionsJSON;
    };

    const authResponse = await startAuthentication({
      optionsJSON: publicKey,
    });

    const finish = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        authentication: authResponse,
      }),
    });

    if (!finish.ok) {
      console.error("Login failed");
      return;
    }

    console.log("Logged in");
  } catch (err) {
    console.error(err);
  }
}

export default function Login() {
  return (
    <div className="h-screen flex items-center justify-center">
      <button
        onClick={handleLogin}
        className="px-6 py-3 bg-black text-white rounded-lg"
      >
        Login with Passkey
      </button>
    </div>
  );
}
```

## domains/auth/auth-ui/src/routes/register.challenge.ts
```
export async function action() {
  const upstream = await fetch(
    "http://traefik-srv/auth/webauthn/registration/challenge",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
  );

  const body = await upstream.text();

  return new Response(body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}
```

## domains/auth/auth-ui/src/routes/register.tsx
```
import {
  startRegistration,
  type RegistrationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
} from "@simplewebauthn/browser";

export async function action({ request }: { request: Request }) {
  const body = (await request.json()) as {
    credential: RegistrationResponseJSON;
  };

  const upstream = await fetch(
    "http://traefik-srv/auth/webauthn/registration",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

async function handleRegister() {
  try {
    const res = await fetch("/register/challenge", {
      method: "POST",
    });

    if (!res.ok) {
      console.error("Challenge failed");
      return;
    }

    const { publicKey } = (await res.json()) as {
      publicKey: PublicKeyCredentialCreationOptionsJSON;
    };

    const registrationResponse = await startRegistration({
      optionsJSON: publicKey,
    });

    const finish = await fetch("/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        credential: registrationResponse,
      }),
    });

    if (!finish.ok) {
      console.error("Finalize failed");
      return;
    }

    console.log("Registered");
  } catch (err) {
    console.error(err);
  }
}

export default function Register() {
  return (
    <div className="h-screen flex items-center justify-center">
      <button
        onClick={handleRegister}
        className="px-6 py-3 bg-black text-white rounded-lg"
      >
        Register Passkey
      </button>
    </div>
  );
}
```

## domains/auth/auth-ui/tsconfig.json
```
{
  "include": [
    "**/*",
    "**/.server/**/*",
    "**/.client/**/*",
    ".react-router/types/**/*"
  ],
  "compilerOptions": {
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "types": ["node", "vite/client"],
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "rootDirs": [".", "./.react-router/types"],
    "baseUrl": ".",
    "esModuleInterop": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "strict": true
  }
}
```

## domains/auth/auth-ui/vite.config.ts
```
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
});
```

## domains/auth/auth-worker/.dockerignore
```
node_modules
Dockerfile```

## domains/auth/auth-worker/Dockerfile
```
FROM node:25-alpine AS base

RUN apk add --no-cache tini

WORKDIR /home/node/app
ENTRYPOINT ["/sbin/tini", "--"]

# DEPS
FROM base AS deps

COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev --strict-peer-deps

# DEV
FROM base AS dev

ENV NODE_ENV=development

COPY --chown=node:node package*.json ./
RUN npm ci

COPY --chown=node:node . .

# 9229 should be for debugger
EXPOSE 3000 9229

USER node

# tini
#   â””â”€â”€ nodemon
#         â””â”€â”€ node
CMD ["./node_modules/.bin/nodemon", "src/index.mjs"]

# PROD
FROM base AS prod

ENV NODE_ENV=production

COPY --from=deps /home/node/app/node_modules ./node_modules
COPY --chown=node:node . .

EXPOSE 3000

USER node

# tini
#   â””â”€â”€ node
CMD ["node", "src/index.mjs"]```

## domains/auth/auth-worker/eslint.config.mjs
```
import pluginJs from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginPerfectionst from "eslint-plugin-perfectionist";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";

export default [
  {
    languageOptions: {
      globals: globals.node,
    },
  },
  pluginJs.configs.recommended,
  eslintPluginPerfectionst.configs["recommended-natural"],
  eslintPluginPrettierRecommended,
  eslintConfigPrettier,
];
```

## domains/auth/auth-worker/jsconfig.json
```
{
  "compilerOptions": {
    "checkJs": true,
    "strict": true,
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "lib": ["ES2024"]
  },
  "exclude": ["node_modules"]
}
```

## domains/auth/auth-worker/package-lock.json
```
{
  "name": "auth-worker",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "auth-worker",
      "dependencies": {
        "@nats-io/jetstream": "^3.3.1",
        "@nats-io/transport-node": "^3.3.1",
        "nconf": "^0.13.0",
        "pg": "^8.18.0"
      },
      "devDependencies": {
        "@eslint/js": "^10.0.1",
        "@types/eslint-config-prettier": "^6.11.3",
        "@types/nconf": "^0.10.7",
        "@types/node": "^25.3.0",
        "eslint": "^10.0.1",
        "eslint-config-prettier": "^10.1.8",
        "eslint-plugin-perfectionist": "^5.6.0",
        "eslint-plugin-prettier": "^5.5.5",
        "globals": "^17.3.0",
        "nodemon": "^3.1.14",
        "prettier": "^3.8.1"
      }
    },
    "node_modules/@eslint-community/eslint-utils": {
      "version": "4.9.1",
      "resolved": "https://registry.npmjs.org/@eslint-community/eslint-utils/-/eslint-utils-4.9.1.tgz",
      "integrity": "sha512-phrYmNiYppR7znFEdqgfWHXR6NCkZEK7hwWDHZUjit/2/U0r6XvkDl0SYnoM51Hq7FhCGdLDT6zxCCOY1hexsQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "eslint-visitor-keys": "^3.4.3"
      },
      "engines": {
        "node": "^12.22.0 || ^14.17.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      },
      "peerDependencies": {
        "eslint": "^6.0.0 || ^7.0.0 || >=8.0.0"
      }
    },
    "node_modules/@eslint-community/eslint-utils/node_modules/eslint-visitor-keys": {
      "version": "3.4.3",
      "resolved": "https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-3.4.3.tgz",
      "integrity": "sha512-wpc+LXeiyiisxPlEkUzU6svyS1frIO3Mgxj1fdy7Pm8Ygzguax2N3Fa/D/ag1WqbOprdI+uY6wMUl8/a2G+iag==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^12.22.0 || ^14.17.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/@eslint-community/regexpp": {
      "version": "4.12.2",
      "resolved": "https://registry.npmjs.org/@eslint-community/regexpp/-/regexpp-4.12.2.tgz",
      "integrity": "sha512-EriSTlt5OC9/7SXkRSCAhfSxxoSUgBm33OH+IkwbdpgoqsSsUg7y3uh+IICI/Qg4BBWr3U2i39RpmycbxMq4ew==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^12.0.0 || ^14.0.0 || >=16.0.0"
      }
    },
    "node_modules/@eslint/config-array": {
      "version": "0.23.3",
      "resolved": "https://registry.npmjs.org/@eslint/config-array/-/config-array-0.23.3.tgz",
      "integrity": "sha512-j+eEWmB6YYLwcNOdlwQ6L2OsptI/LO6lNBuLIqe5R7RetD658HLoF+Mn7LzYmAWWNNzdC6cqP+L6r8ujeYXWLw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@eslint/object-schema": "^3.0.3",
        "debug": "^4.3.1",
        "minimatch": "^10.2.4"
      },
      "engines": {
        "node": "^20.19.0 || ^22.13.0 || >=24"
      }
    },
    "node_modules/@eslint/config-helpers": {
      "version": "0.5.3",
      "resolved": "https://registry.npmjs.org/@eslint/config-helpers/-/config-helpers-0.5.3.tgz",
      "integrity": "sha512-lzGN0onllOZCGroKJmRwY6QcEHxbjBw1gwB8SgRSqK8YbbtEXMvKynsXc3553ckIEBxsbMBU7oOZXKIPGZNeZw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@eslint/core": "^1.1.1"
      },
      "engines": {
        "node": "^20.19.0 || ^22.13.0 || >=24"
      }
    },
    "node_modules/@eslint/core": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/@eslint/core/-/core-1.1.1.tgz",
      "integrity": "sha512-QUPblTtE51/7/Zhfv8BDwO0qkkzQL7P/aWWbqcf4xWLEYn1oKjdO0gglQBB4GAsu7u6wjijbCmzsUTy6mnk6oQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@types/json-schema": "^7.0.15"
      },
      "engines": {
        "node": "^20.19.0 || ^22.13.0 || >=24"
      }
    },
    "node_modules/@eslint/js": {
      "version": "10.0.1",
      "resolved": "https://registry.npmjs.org/@eslint/js/-/js-10.0.1.tgz",
      "integrity": "sha512-zeR9k5pd4gxjZ0abRoIaxdc7I3nDktoXZk2qOv9gCNWx3mVwEn32VRhyLaRsDiJjTs0xq/T8mfPtyuXu7GWBcA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^20.19.0 || ^22.13.0 || >=24"
      },
      "funding": {
        "url": "https://eslint.org/donate"
      },
      "peerDependencies": {
        "eslint": "^10.0.0"
      },
      "peerDependenciesMeta": {
        "eslint": {
          "optional": true
        }
      }
    },
    "node_modules/@eslint/object-schema": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/@eslint/object-schema/-/object-schema-3.0.3.tgz",
      "integrity": "sha512-iM869Pugn9Nsxbh/YHRqYiqd23AmIbxJOcpUMOuWCVNdoQJ5ZtwL6h3t0bcZzJUlC3Dq9jCFCESBZnX0GTv7iQ==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^20.19.0 || ^22.13.0 || >=24"
      }
    },
    "node_modules/@eslint/plugin-kit": {
      "version": "0.6.1",
      "resolved": "https://registry.npmjs.org/@eslint/plugin-kit/-/plugin-kit-0.6.1.tgz",
      "integrity": "sha512-iH1B076HoAshH1mLpHMgwdGeTs0CYwL0SPMkGuSebZrwBp16v415e9NZXg2jtrqPVQjf6IANe2Vtlr5KswtcZQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@eslint/core": "^1.1.1",
        "levn": "^0.4.1"
      },
      "engines": {
        "node": "^20.19.0 || ^22.13.0 || >=24"
      }
    },
    "node_modules/@humanfs/core": {
      "version": "0.19.1",
      "resolved": "https://registry.npmjs.org/@humanfs/core/-/core-0.19.1.tgz",
      "integrity": "sha512-5DyQ4+1JEUzejeK1JGICcideyfUbGixgS9jNgex5nqkW+cY7WZhxBigmieN5Qnw9ZosSNVC9KQKyb+GUaGyKUA==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=18.18.0"
      }
    },
    "node_modules/@humanfs/node": {
      "version": "0.16.7",
      "resolved": "https://registry.npmjs.org/@humanfs/node/-/node-0.16.7.tgz",
      "integrity": "sha512-/zUx+yOsIrG4Y43Eh2peDeKCxlRt/gET6aHfaKpuq267qXdYDFViVHfMaLyygZOnl0kGWxFIgsBy8QFuTLUXEQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@humanfs/core": "^0.19.1",
        "@humanwhocodes/retry": "^0.4.0"
      },
      "engines": {
        "node": ">=18.18.0"
      }
    },
    "node_modules/@humanwhocodes/module-importer": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/@humanwhocodes/module-importer/-/module-importer-1.0.1.tgz",
      "integrity": "sha512-bxveV4V8v5Yb4ncFTT3rPSgZBOpCkjfK0y4oVVVJwIuDVBRMDXrPyXRL988i5ap9m9bnyEEjWfm5WkBmtffLfA==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=12.22"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/nzakas"
      }
    },
    "node_modules/@humanwhocodes/retry": {
      "version": "0.4.3",
      "resolved": "https://registry.npmjs.org/@humanwhocodes/retry/-/retry-0.4.3.tgz",
      "integrity": "sha512-bV0Tgo9K4hfPCek+aMAn81RppFKv2ySDQeMoSZuvTASywNTnVJCArCZE2FWqpvIatKu7VMRLWlR1EazvVhDyhQ==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=18.18"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/nzakas"
      }
    },
    "node_modules/@nats-io/jetstream": {
      "version": "3.3.1",
      "resolved": "https://registry.npmjs.org/@nats-io/jetstream/-/jetstream-3.3.1.tgz",
      "integrity": "sha512-oTIxM47pQfv4zCMlLN7FtARxSclMlUUPPn9I3VxRwMH+N2jkj1WCApu+tSL778KuljxfG8txi/MPwoWSXqbbQQ==",
      "license": "Apache-2.0",
      "dependencies": {
        "@nats-io/nats-core": "3.3.1"
      }
    },
    "node_modules/@nats-io/nats-core": {
      "version": "3.3.1",
      "resolved": "https://registry.npmjs.org/@nats-io/nats-core/-/nats-core-3.3.1.tgz",
      "integrity": "sha512-myFXGTo4cCfKrsLDjkoEz7FjjjvSfBRjun7Qx3n3Z5OzW4JUY8Ou7VQsGAdXLQxHN3ae/XNXvmXxshDoFPex4w==",
      "license": "Apache-2.0",
      "dependencies": {
        "@nats-io/nkeys": "2.0.3",
        "@nats-io/nuid": "2.0.3"
      }
    },
    "node_modules/@nats-io/nkeys": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/@nats-io/nkeys/-/nkeys-2.0.3.tgz",
      "integrity": "sha512-JVt56GuE6Z89KUkI4TXUbSI9fmIfAmk6PMPknijmuL72GcD+UgIomTcRWiNvvJKxA01sBbmIPStqJs5cMRBC3A==",
      "license": "Apache-2.0",
      "dependencies": {
        "tweetnacl": "^1.0.3"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@nats-io/nuid": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/@nats-io/nuid/-/nuid-2.0.3.tgz",
      "integrity": "sha512-TpA3HEBna/qMVudy+3HZr5M3mo/L1JPofpVT4t0HkFGkz2Cn9wrlrQC8tvR8Md5Oa9//GtGG26eN0qEWF5Vqew==",
      "license": "Apache-2.0",
      "engines": {
        "node": ">= 18.x"
      }
    },
    "node_modules/@nats-io/transport-node": {
      "version": "3.3.1",
      "resolved": "https://registry.npmjs.org/@nats-io/transport-node/-/transport-node-3.3.1.tgz",
      "integrity": "sha512-GBvY0VcvyQEILgy5bjpqU1GpDYmSF06bW59I7cewZuNGS9u3AoV/gf+a+3ep45T/Z+UC661atq/b7x+QV12w+Q==",
      "license": "Apache-2.0",
      "dependencies": {
        "@nats-io/nats-core": "3.3.1",
        "@nats-io/nkeys": "2.0.3",
        "@nats-io/nuid": "2.0.3"
      },
      "engines": {
        "node": ">= 18.0.0"
      }
    },
    "node_modules/@pkgr/core": {
      "version": "0.2.9",
      "resolved": "https://registry.npmjs.org/@pkgr/core/-/core-0.2.9.tgz",
      "integrity": "sha512-QNqXyfVS2wm9hweSYD2O7F0G06uurj9kZ96TRQE5Y9hU7+tgdZwIkbAKc5Ocy1HxEY2kuDQa6cQ1WRs/O5LFKA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^12.20.0 || ^14.18.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/pkgr"
      }
    },
    "node_modules/@types/eslint-config-prettier": {
      "version": "6.11.3",
      "resolved": "https://registry.npmjs.org/@types/eslint-config-prettier/-/eslint-config-prettier-6.11.3.tgz",
      "integrity": "sha512-3wXCiM8croUnhg9LdtZUJQwNcQYGWxxdOWDjPe1ykCqJFPVpzAKfs/2dgSoCtAvdPeaponcWPI7mPcGGp9dkKQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/esrecurse": {
      "version": "4.3.1",
      "resolved": "https://registry.npmjs.org/@types/esrecurse/-/esrecurse-4.3.1.tgz",
      "integrity": "sha512-xJBAbDifo5hpffDBuHl0Y8ywswbiAp/Wi7Y/GtAgSlZyIABppyurxVueOPE8LUQOxdlgi6Zqce7uoEpqNTeiUw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/estree": {
      "version": "1.0.8",
      "resolved": "https://registry.npmjs.org/@types/estree/-/estree-1.0.8.tgz",
      "integrity": "sha512-dWHzHa2WqEXI/O1E9OjrocMTKJl2mSrEolh1Iomrv6U+JuNwaHXsXx9bLu5gG7BUWFIN0skIQJQ/L1rIex4X6w==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/json-schema": {
      "version": "7.0.15",
      "resolved": "https://registry.npmjs.org/@types/json-schema/-/json-schema-7.0.15.tgz",
      "integrity": "sha512-5+fP8P8MFNC+AyZCDxrB2pkZFPGzqQWUzpSeuuVLvm8VMcorNYavBqoFcxK8bQz4Qsbn4oUEEem4wDLfcysGHA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/nconf": {
      "version": "0.10.7",
      "resolved": "https://registry.npmjs.org/@types/nconf/-/nconf-0.10.7.tgz",
      "integrity": "sha512-ltJgbQX0XgjkeDrz0anTCXLBLatppWYFCxp88ILEwybfAuyNWr0Qb+ceFFqZ0VDR8fguEjr0hH37ZF+AF4gsxw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/node": {
      "version": "25.5.0",
      "resolved": "https://registry.npmjs.org/@types/node/-/node-25.5.0.tgz",
      "integrity": "sha512-jp2P3tQMSxWugkCUKLRPVUpGaL5MVFwF8RDuSRztfwgN1wmqJeMSbKlnEtQqU8UrhTmzEmZdu2I6v2dpp7XIxw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "undici-types": "~7.18.0"
      }
    },
    "node_modules/@typescript-eslint/project-service": {
      "version": "8.57.1",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/project-service/-/project-service-8.57.1.tgz",
      "integrity": "sha512-vx1F37BRO1OftsYlmG9xay1TqnjNVlqALymwWVuYTdo18XuKxtBpCj1QlzNIEHlvlB27osvXFWptYiEWsVdYsg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/tsconfig-utils": "^8.57.1",
        "@typescript-eslint/types": "^8.57.1",
        "debug": "^4.4.3"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "typescript": ">=4.8.4 <6.0.0"
      }
    },
    "node_modules/@typescript-eslint/scope-manager": {
      "version": "8.57.1",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/scope-manager/-/scope-manager-8.57.1.tgz",
      "integrity": "sha512-hs/QcpCwlwT2L5S+3fT6gp0PabyGk4Q0Rv2doJXA0435/OpnSR3VRgvrp8Xdoc3UAYSg9cyUjTeFXZEPg/3OKg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/types": "8.57.1",
        "@typescript-eslint/visitor-keys": "8.57.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      }
    },
    "node_modules/@typescript-eslint/tsconfig-utils": {
      "version": "8.57.1",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/tsconfig-utils/-/tsconfig-utils-8.57.1.tgz",
      "integrity": "sha512-0lgOZB8cl19fHO4eI46YUx2EceQqhgkPSuCGLlGi79L2jwYY1cxeYc1Nae8Aw1xjgW3PKVDLlr3YJ6Bxx8HkWg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "typescript": ">=4.8.4 <6.0.0"
      }
    },
    "node_modules/@typescript-eslint/types": {
      "version": "8.57.1",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/types/-/types-8.57.1.tgz",
      "integrity": "sha512-S29BOBPJSFUiblEl6RzPPjJt6w25A6XsBqRVDt53tA/tlL8q7ceQNZHTjPeONt/3S7KRI4quk+yP9jK2WjBiPQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      }
    },
    "node_modules/@typescript-eslint/typescript-estree": {
      "version": "8.57.1",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/typescript-estree/-/typescript-estree-8.57.1.tgz",
      "integrity": "sha512-ybe2hS9G6pXpqGtPli9Gx9quNV0TWLOmh58ADlmZe9DguLq0tiAKVjirSbtM1szG6+QH6rVXyU6GTLQbWnMY+g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/project-service": "8.57.1",
        "@typescript-eslint/tsconfig-utils": "8.57.1",
        "@typescript-eslint/types": "8.57.1",
        "@typescript-eslint/visitor-keys": "8.57.1",
        "debug": "^4.4.3",
        "minimatch": "^10.2.2",
        "semver": "^7.7.3",
        "tinyglobby": "^0.2.15",
        "ts-api-utils": "^2.4.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "typescript": ">=4.8.4 <6.0.0"
      }
    },
    "node_modules/@typescript-eslint/utils": {
      "version": "8.57.1",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/utils/-/utils-8.57.1.tgz",
      "integrity": "sha512-XUNSJ/lEVFttPMMoDVA2r2bwrl8/oPx8cURtczkSEswY5T3AeLmCy+EKWQNdL4u0MmAHOjcWrqJp2cdvgjn8dQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@eslint-community/eslint-utils": "^4.9.1",
        "@typescript-eslint/scope-manager": "8.57.1",
        "@typescript-eslint/types": "8.57.1",
        "@typescript-eslint/typescript-estree": "8.57.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "eslint": "^8.57.0 || ^9.0.0 || ^10.0.0",
        "typescript": ">=4.8.4 <6.0.0"
      }
    },
    "node_modules/@typescript-eslint/visitor-keys": {
      "version": "8.57.1",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/visitor-keys/-/visitor-keys-8.57.1.tgz",
      "integrity": "sha512-YWnmJkXbofiz9KbnbbwuA2rpGkFPLbAIetcCNO6mJ8gdhdZ/v7WDXsoGFAJuM6ikUFKTlSQnjWnVO4ux+UzS6A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/types": "8.57.1",
        "eslint-visitor-keys": "^5.0.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      }
    },
    "node_modules/acorn": {
      "version": "8.16.0",
      "resolved": "https://registry.npmjs.org/acorn/-/acorn-8.16.0.tgz",
      "integrity": "sha512-UVJyE9MttOsBQIDKw1skb9nAwQuR5wuGD3+82K6JgJlm/Y+KI92oNsMNGZCYdDsVtRHSak0pcV5Dno5+4jh9sw==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "acorn": "bin/acorn"
      },
      "engines": {
        "node": ">=0.4.0"
      }
    },
    "node_modules/acorn-jsx": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/acorn-jsx/-/acorn-jsx-5.3.2.tgz",
      "integrity": "sha512-rq9s+JNhf0IChjtDXxllJ7g41oZk5SlXtp0LHwyA5cejwn7vKmKp4pPri6YEePv2PU65sAsegbXtIinmDFDXgQ==",
      "dev": true,
      "license": "MIT",
      "peerDependencies": {
        "acorn": "^6.0.0 || ^7.0.0 || ^8.0.0"
      }
    },
    "node_modules/ajv": {
      "version": "6.14.0",
      "resolved": "https://registry.npmjs.org/ajv/-/ajv-6.14.0.tgz",
      "integrity": "sha512-IWrosm/yrn43eiKqkfkHis7QioDleaXQHdDVPKg0FSwwd/DuvyX79TZnFOnYpB7dcsFAMmtFztZuXPDvSePkFw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fast-deep-equal": "^3.1.1",
        "fast-json-stable-stringify": "^2.0.0",
        "json-schema-traverse": "^0.4.1",
        "uri-js": "^4.2.2"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/epoberezkin"
      }
    },
    "node_modules/ansi-regex": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-5.0.1.tgz",
      "integrity": "sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/ansi-styles": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-4.3.0.tgz",
      "integrity": "sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg==",
      "license": "MIT",
      "dependencies": {
        "color-convert": "^2.0.1"
      },
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-styles?sponsor=1"
      }
    },
    "node_modules/anymatch": {
      "version": "3.1.3",
      "resolved": "https://registry.npmjs.org/anymatch/-/anymatch-3.1.3.tgz",
      "integrity": "sha512-KMReFUr0B4t+D+OBkjR3KYqvocp2XaSzO55UcB6mgQMd3KbcE+mWTyvVV7D/zsdEbNnV6acZUutkiHQXvTr1Rw==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "normalize-path": "^3.0.0",
        "picomatch": "^2.0.4"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/async": {
      "version": "3.2.6",
      "resolved": "https://registry.npmjs.org/async/-/async-3.2.6.tgz",
      "integrity": "sha512-htCUDlxyyCLMgaM3xXg0C0LW2xqfuQ6p05pCEIsXuyQ+a1koYKTuBMzRNwmybfLgvJDMd0r1LTn4+E0Ti6C2AA==",
      "license": "MIT"
    },
    "node_modules/balanced-match": {
      "version": "4.0.4",
      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-4.0.4.tgz",
      "integrity": "sha512-BLrgEcRTwX2o6gGxGOCNyMvGSp35YofuYzw9h1IMTRmKqttAZZVU67bdb9Pr2vUHA8+j3i2tJfjO6C6+4myGTA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "18 || 20 || >=22"
      }
    },
    "node_modules/binary-extensions": {
      "version": "2.3.0",
      "resolved": "https://registry.npmjs.org/binary-extensions/-/binary-extensions-2.3.0.tgz",
      "integrity": "sha512-Ceh+7ox5qe7LJuLHoY0feh3pHuUDHAcRUeyL2VYghZwfpkNIy/+8Ocg0a3UuSoYzavmylwuLWQOf3hl0jjMMIw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/brace-expansion": {
      "version": "5.0.4",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-5.0.4.tgz",
      "integrity": "sha512-h+DEnpVvxmfVefa4jFbCf5HdH5YMDXRsmKflpf1pILZWRFlTbJpxeU55nJl4Smt5HQaGzg1o6RHFPJaOqnmBDg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^4.0.2"
      },
      "engines": {
        "node": "18 || 20 || >=22"
      }
    },
    "node_modules/braces": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/braces/-/braces-3.0.3.tgz",
      "integrity": "sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fill-range": "^7.1.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/chokidar": {
      "version": "3.6.0",
      "resolved": "https://registry.npmjs.org/chokidar/-/chokidar-3.6.0.tgz",
      "integrity": "sha512-7VT13fmjotKpGipCW9JEQAusEPE+Ei8nl6/g4FBAmIm0GOOLMua9NDDo/DWp0ZAxCr3cPq5ZpBqmPAQgDda2Pw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "anymatch": "~3.1.2",
        "braces": "~3.0.2",
        "glob-parent": "~5.1.2",
        "is-binary-path": "~2.1.0",
        "is-glob": "~4.0.1",
        "normalize-path": "~3.0.0",
        "readdirp": "~3.6.0"
      },
      "engines": {
        "node": ">= 8.10.0"
      },
      "funding": {
        "url": "https://paulmillr.com/funding/"
      },
      "optionalDependencies": {
        "fsevents": "~2.3.2"
      }
    },
    "node_modules/chokidar/node_modules/glob-parent": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/glob-parent/-/glob-parent-5.1.2.tgz",
      "integrity": "sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "is-glob": "^4.0.1"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/cliui": {
      "version": "7.0.4",
      "resolved": "https://registry.npmjs.org/cliui/-/cliui-7.0.4.tgz",
      "integrity": "sha512-OcRE68cOsVMXp1Yvonl/fzkQOyjLSu/8bhPDfQt0e0/Eb283TKP20Fs2MqoPsr9SwA595rRCA+QMzYc9nBP+JQ==",
      "license": "ISC",
      "dependencies": {
        "string-width": "^4.2.0",
        "strip-ansi": "^6.0.0",
        "wrap-ansi": "^7.0.0"
      }
    },
    "node_modules/color-convert": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/color-convert/-/color-convert-2.0.1.tgz",
      "integrity": "sha512-RRECPsj7iu/xb5oKYcsFHSppFNnsj/52OVTRKb4zP5onXwVF3zVmmToNcOfGC+CRDpfK/U584fMg38ZHCaElKQ==",
      "license": "MIT",
      "dependencies": {
        "color-name": "~1.1.4"
      },
      "engines": {
        "node": ">=7.0.0"
      }
    },
    "node_modules/color-name": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/color-name/-/color-name-1.1.4.tgz",
      "integrity": "sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA==",
      "license": "MIT"
    },
    "node_modules/cross-spawn": {
      "version": "7.0.6",
      "resolved": "https://registry.npmjs.org/cross-spawn/-/cross-spawn-7.0.6.tgz",
      "integrity": "sha512-uV2QOWP2nWzsy2aMp8aRibhi9dlzF5Hgh5SHaB9OiTGEyDTiJJyx0uy51QXdyWbtAHNua4XJzUKca3OzKUd3vA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "path-key": "^3.1.0",
        "shebang-command": "^2.0.0",
        "which": "^2.0.1"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/debug": {
      "version": "4.4.3",
      "resolved": "https://registry.npmjs.org/debug/-/debug-4.4.3.tgz",
      "integrity": "sha512-RGwwWnwQvkVfavKVt22FGLw+xYSdzARwm0ru6DhTVA3umU5hZc28V3kO4stgYryrTlLpuvgI9GiijltAjNbcqA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ms": "^2.1.3"
      },
      "engines": {
        "node": ">=6.0"
      },
      "peerDependenciesMeta": {
        "supports-color": {
          "optional": true
        }
      }
    },
    "node_modules/deep-is": {
      "version": "0.1.4",
      "resolved": "https://registry.npmjs.org/deep-is/-/deep-is-0.1.4.tgz",
      "integrity": "sha512-oIPzksmTg4/MriiaYGO+okXDT7ztn/w3Eptv/+gSIdMdKsJo0u4CfYNFJPy+4SKMuCqGw2wxnA+URMg3t8a/bQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/emoji-regex": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/emoji-regex/-/emoji-regex-8.0.0.tgz",
      "integrity": "sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A==",
      "license": "MIT"
    },
    "node_modules/escalade": {
      "version": "3.2.0",
      "resolved": "https://registry.npmjs.org/escalade/-/escalade-3.2.0.tgz",
      "integrity": "sha512-WUj2qlxaQtO4g6Pq5c29GTcWGDyd8itL8zTlipgECz3JesAiiOKotd8JU6otB3PACgG6xkJUyVhboMS+bje/jA==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/escape-string-regexp": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/escape-string-regexp/-/escape-string-regexp-4.0.0.tgz",
      "integrity": "sha512-TtpcNJ3XAzx3Gq8sWRzJaVajRs0uVxA2YAkdb1jm2YkPz4G6egUFAyA3n5vtEIZefPk5Wa4UXbKuS5fKkJWdgA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/eslint": {
      "version": "10.1.0",
      "resolved": "https://registry.npmjs.org/eslint/-/eslint-10.1.0.tgz",
      "integrity": "sha512-S9jlY/ELKEUwwQnqWDO+f+m6sercqOPSqXM5Go94l7DOmxHVDgmSFGWEzeE/gwgTAr0W103BWt0QLe/7mabIvA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@eslint-community/eslint-utils": "^4.8.0",
        "@eslint-community/regexpp": "^4.12.2",
        "@eslint/config-array": "^0.23.3",
        "@eslint/config-helpers": "^0.5.3",
        "@eslint/core": "^1.1.1",
        "@eslint/plugin-kit": "^0.6.1",
        "@humanfs/node": "^0.16.6",
        "@humanwhocodes/module-importer": "^1.0.1",
        "@humanwhocodes/retry": "^0.4.2",
        "@types/estree": "^1.0.6",
        "ajv": "^6.14.0",
        "cross-spawn": "^7.0.6",
        "debug": "^4.3.2",
        "escape-string-regexp": "^4.0.0",
        "eslint-scope": "^9.1.2",
        "eslint-visitor-keys": "^5.0.1",
        "espree": "^11.2.0",
        "esquery": "^1.7.0",
        "esutils": "^2.0.2",
        "fast-deep-equal": "^3.1.3",
        "file-entry-cache": "^8.0.0",
        "find-up": "^5.0.0",
        "glob-parent": "^6.0.2",
        "ignore": "^5.2.0",
        "imurmurhash": "^0.1.4",
        "is-glob": "^4.0.0",
        "json-stable-stringify-without-jsonify": "^1.0.1",
        "minimatch": "^10.2.4",
        "natural-compare": "^1.4.0",
        "optionator": "^0.9.3"
      },
      "bin": {
        "eslint": "bin/eslint.js"
      },
      "engines": {
        "node": "^20.19.0 || ^22.13.0 || >=24"
      },
      "funding": {
        "url": "https://eslint.org/donate"
      },
      "peerDependencies": {
        "jiti": "*"
      },
      "peerDependenciesMeta": {
        "jiti": {
          "optional": true
        }
      }
    },
    "node_modules/eslint-config-prettier": {
      "version": "10.1.8",
      "resolved": "https://registry.npmjs.org/eslint-config-prettier/-/eslint-config-prettier-10.1.8.tgz",
      "integrity": "sha512-82GZUjRS0p/jganf6q1rEO25VSoHH0hKPCTrgillPjdI/3bgBhAE1QzHrHTizjpRvy6pGAvKjDJtk2pF9NDq8w==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "eslint-config-prettier": "bin/cli.js"
      },
      "funding": {
        "url": "https://opencollective.com/eslint-config-prettier"
      },
      "peerDependencies": {
        "eslint": ">=7.0.0"
      }
    },
    "node_modules/eslint-plugin-perfectionist": {
      "version": "5.7.0",
      "resolved": "https://registry.npmjs.org/eslint-plugin-perfectionist/-/eslint-plugin-perfectionist-5.7.0.tgz",
      "integrity": "sha512-WRHj7OZS/INutQ/gKN5C1ZGnMhkQ3oKZQAA2I7rl5yM8keBtSd9oj/qlJaHuwh5873FhMPqYlttcadF0YsTN7g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/utils": "^8.57.1",
        "natural-orderby": "^5.0.0"
      },
      "engines": {
        "node": "^20.0.0 || >=22.0.0"
      },
      "peerDependencies": {
        "eslint": "^8.45.0 || ^9.0.0 || ^10.0.0"
      }
    },
    "node_modules/eslint-plugin-prettier": {
      "version": "5.5.5",
      "resolved": "https://registry.npmjs.org/eslint-plugin-prettier/-/eslint-plugin-prettier-5.5.5.tgz",
      "integrity": "sha512-hscXkbqUZ2sPithAuLm5MXL+Wph+U7wHngPBv9OMWwlP8iaflyxpjTYZkmdgB4/vPIhemRlBEoLrH7UC1n7aUw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "prettier-linter-helpers": "^1.0.1",
        "synckit": "^0.11.12"
      },
      "engines": {
        "node": "^14.18.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint-plugin-prettier"
      },
      "peerDependencies": {
        "@types/eslint": ">=8.0.0",
        "eslint": ">=8.0.0",
        "eslint-config-prettier": ">= 7.0.0 <10.0.0 || >=10.1.0",
        "prettier": ">=3.0.0"
      },
      "peerDependenciesMeta": {
        "@types/eslint": {
          "optional": true
        },
        "eslint-config-prettier": {
          "optional": true
        }
      }
    },
    "node_modules/eslint-scope": {
      "version": "9.1.2",
      "resolved": "https://registry.npmjs.org/eslint-scope/-/eslint-scope-9.1.2.tgz",
      "integrity": "sha512-xS90H51cKw0jltxmvmHy2Iai1LIqrfbw57b79w/J7MfvDfkIkFZ+kj6zC3BjtUwh150HsSSdxXZcsuv72miDFQ==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "@types/esrecurse": "^4.3.1",
        "@types/estree": "^1.0.8",
        "esrecurse": "^4.3.0",
        "estraverse": "^5.2.0"
      },
      "engines": {
        "node": "^20.19.0 || ^22.13.0 || >=24"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/eslint-visitor-keys": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-5.0.1.tgz",
      "integrity": "sha512-tD40eHxA35h0PEIZNeIjkHoDR4YjjJp34biM0mDvplBe//mB+IHCqHDGV7pxF+7MklTvighcCPPZC7ynWyjdTA==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^20.19.0 || ^22.13.0 || >=24"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/espree": {
      "version": "11.2.0",
      "resolved": "https://registry.npmjs.org/espree/-/espree-11.2.0.tgz",
      "integrity": "sha512-7p3DrVEIopW1B1avAGLuCSh1jubc01H2JHc8B4qqGblmg5gI9yumBgACjWo4JlIc04ufug4xJ3SQI8HkS/Rgzw==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "acorn": "^8.16.0",
        "acorn-jsx": "^5.3.2",
        "eslint-visitor-keys": "^5.0.1"
      },
      "engines": {
        "node": "^20.19.0 || ^22.13.0 || >=24"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/esquery": {
      "version": "1.7.0",
      "resolved": "https://registry.npmjs.org/esquery/-/esquery-1.7.0.tgz",
      "integrity": "sha512-Ap6G0WQwcU/LHsvLwON1fAQX9Zp0A2Y6Y/cJBl9r/JbW90Zyg4/zbG6zzKa2OTALELarYHmKu0GhpM5EO+7T0g==",
      "dev": true,
      "license": "BSD-3-Clause",
      "dependencies": {
        "estraverse": "^5.1.0"
      },
      "engines": {
        "node": ">=0.10"
      }
    },
    "node_modules/esrecurse": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/esrecurse/-/esrecurse-4.3.0.tgz",
      "integrity": "sha512-KmfKL3b6G+RXvP8N1vr3Tq1kL/oCFgn2NYXEtqP8/L3pKapUA4G8cFVaoF3SU323CD4XypR/ffioHmkti6/Tag==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "estraverse": "^5.2.0"
      },
      "engines": {
        "node": ">=4.0"
      }
    },
    "node_modules/estraverse": {
      "version": "5.3.0",
      "resolved": "https://registry.npmjs.org/estraverse/-/estraverse-5.3.0.tgz",
      "integrity": "sha512-MMdARuVEQziNTeJD8DgMqmhwR11BRQ/cBP+pLtYdSTnf3MIO8fFeiINEbX36ZdNlfU/7A9f3gUw49B3oQsvwBA==",
      "dev": true,
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=4.0"
      }
    },
    "node_modules/esutils": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/esutils/-/esutils-2.0.3.tgz",
      "integrity": "sha512-kVscqXk4OCp68SZ0dkgEKVi6/8ij300KBWTJq32P/dYeWTSwK41WyTxalN1eRmA5Z9UU/LX9D7FWSmV9SAYx6g==",
      "dev": true,
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/fast-deep-equal": {
      "version": "3.1.3",
      "resolved": "https://registry.npmjs.org/fast-deep-equal/-/fast-deep-equal-3.1.3.tgz",
      "integrity": "sha512-f3qQ9oQy9j2AhBe/H9VC91wLmKBCCU/gDOnKNAYG5hswO7BLKj09Hc5HYNz9cGI++xlpDCIgDaitVs03ATR84Q==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/fast-diff": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/fast-diff/-/fast-diff-1.3.0.tgz",
      "integrity": "sha512-VxPP4NqbUjj6MaAOafWeUn2cXWLcCtljklUtZf0Ind4XQ+QPtmA0b18zZy0jIQx+ExRVCR/ZQpBmik5lXshNsw==",
      "dev": true,
      "license": "Apache-2.0"
    },
    "node_modules/fast-json-stable-stringify": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/fast-json-stable-stringify/-/fast-json-stable-stringify-2.1.0.tgz",
      "integrity": "sha512-lhd/wF+Lk98HZoTCtlVraHtfh5XYijIjalXck7saUtuanSDyLMxnHhSXEDJqHxD7msR8D0uCmqlkwjCV8xvwHw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/fast-levenshtein": {
      "version": "2.0.6",
      "resolved": "https://registry.npmjs.org/fast-levenshtein/-/fast-levenshtein-2.0.6.tgz",
      "integrity": "sha512-DCXu6Ifhqcks7TZKY3Hxp3y6qphY5SJZmrWMDrKcERSOXWQdMhU9Ig/PYrzyw/ul9jOIyh0N4M0tbC5hodg8dw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/file-entry-cache": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/file-entry-cache/-/file-entry-cache-8.0.0.tgz",
      "integrity": "sha512-XXTUwCvisa5oacNGRP9SfNtYBNAMi+RPwBFmblZEF7N7swHYQS6/Zfk7SRwx4D5j3CH211YNRco1DEMNVfZCnQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "flat-cache": "^4.0.0"
      },
      "engines": {
        "node": ">=16.0.0"
      }
    },
    "node_modules/fill-range": {
      "version": "7.1.1",
      "resolved": "https://registry.npmjs.org/fill-range/-/fill-range-7.1.1.tgz",
      "integrity": "sha512-YsGpe3WHLK8ZYi4tWDg2Jy3ebRz2rXowDxnld4bkQB00cc/1Zw9AWnC0i9ztDJitivtQvaI9KaLyKrc+hBW0yg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "to-regex-range": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/find-up": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/find-up/-/find-up-5.0.0.tgz",
      "integrity": "sha512-78/PXT1wlLLDgTzDs7sjq9hzz0vXD+zn+7wypEe4fXQxCmdmqfGsEPQxmiCSQI3ajFV91bVSsvNtrJRiW6nGng==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "locate-path": "^6.0.0",
        "path-exists": "^4.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/flat-cache": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/flat-cache/-/flat-cache-4.0.1.tgz",
      "integrity": "sha512-f7ccFPK3SXFHpx15UIGyRJ/FJQctuKZ0zVuN3frBo4HnK3cay9VEW0R6yPYFHC0AgqhukPzKjq22t5DmAyqGyw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "flatted": "^3.2.9",
        "keyv": "^4.5.4"
      },
      "engines": {
        "node": ">=16"
      }
    },
    "node_modules/flatted": {
      "version": "3.4.2",
      "resolved": "https://registry.npmjs.org/flatted/-/flatted-3.4.2.tgz",
      "integrity": "sha512-PjDse7RzhcPkIJwy5t7KPWQSZ9cAbzQXcafsetQoD7sOJRQlGikNbx7yZp2OotDnJyrDcbyRq3Ttb18iYOqkxA==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/fsevents": {
      "version": "2.3.3",
      "resolved": "https://registry.npmjs.org/fsevents/-/fsevents-2.3.3.tgz",
      "integrity": "sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^8.16.0 || ^10.6.0 || >=11.0.0"
      }
    },
    "node_modules/get-caller-file": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/get-caller-file/-/get-caller-file-2.0.5.tgz",
      "integrity": "sha512-DyFP3BM/3YHTQOCUL/w0OZHR0lpKeGrxotcHWcqNEdnltqFwXVfhEBQ94eIo34AfQpo0rGki4cyIiftY06h2Fg==",
      "license": "ISC",
      "engines": {
        "node": "6.* || 8.* || >= 10.*"
      }
    },
    "node_modules/glob-parent": {
      "version": "6.0.2",
      "resolved": "https://registry.npmjs.org/glob-parent/-/glob-parent-6.0.2.tgz",
      "integrity": "sha512-XxwI8EOhVQgWp6iDL+3b0r86f4d6AX6zSU55HfB4ydCEuXLXc5FcYeOu+nnGftS4TEju/11rt4KJPTMgbfmv4A==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "is-glob": "^4.0.3"
      },
      "engines": {
        "node": ">=10.13.0"
      }
    },
    "node_modules/globals": {
      "version": "17.4.0",
      "resolved": "https://registry.npmjs.org/globals/-/globals-17.4.0.tgz",
      "integrity": "sha512-hjrNztw/VajQwOLsMNT1cbJiH2muO3OROCHnbehc8eY5JyD2gqz4AcMHPqgaOR59DjgUjYAYLeH699g/eWi2jw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/has-flag": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/has-flag/-/has-flag-3.0.0.tgz",
      "integrity": "sha512-sKJf1+ceQBr4SMkvQnBDNDtf4TXpVhVGateu0t918bl30FnbE2m4vNLX+VWe/dpjlb+HugGYzW7uQXH98HPEYw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/ignore": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/ignore/-/ignore-5.3.2.tgz",
      "integrity": "sha512-hsBTNUqQTDwkWtcdYI2i06Y/nUBEsNEDJKjWdigLvegy8kDuJAS8uRlpkkcQpyEXL0Z/pjDy5HBmMjRCJ2gq+g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 4"
      }
    },
    "node_modules/ignore-by-default": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/ignore-by-default/-/ignore-by-default-1.0.1.tgz",
      "integrity": "sha512-Ius2VYcGNk7T90CppJqcIkS5ooHUZyIQK+ClZfMfMNFEF9VSE73Fq+906u/CWu92x4gzZMWOwfFYckPObzdEbA==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/imurmurhash": {
      "version": "0.1.4",
      "resolved": "https://registry.npmjs.org/imurmurhash/-/imurmurhash-0.1.4.tgz",
      "integrity": "sha512-JmXMZ6wuvDmLiHEml9ykzqO6lwFbof0GG4IkcGaENdCRDDmMVnny7s5HsIgHCbaq0w2MyPhDqkhTUgS2LU2PHA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.8.19"
      }
    },
    "node_modules/ini": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/ini/-/ini-2.0.0.tgz",
      "integrity": "sha512-7PnF4oN3CvZF23ADhA5wRaYEQpJ8qygSkbtTXWBeXWXmEVRXK+1ITciHWwHhsjv1TmW0MgacIv6hEi5pX5NQdA==",
      "license": "ISC",
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/is-binary-path": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/is-binary-path/-/is-binary-path-2.1.0.tgz",
      "integrity": "sha512-ZMERYes6pDydyuGidse7OsHxtbI7WVeUEozgR/g7rd0xUimYNlvZRE/K2MgZTjWy725IfelLeVcEM97mmtRGXw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "binary-extensions": "^2.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/is-extglob": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/is-extglob/-/is-extglob-2.1.1.tgz",
      "integrity": "sha512-SbKbANkN603Vi4jEZv49LeVJMn4yGwsbzZworEoyEiutsN3nJYdbO36zfhGJ6QEDpOZIFkDtnq5JRxmvl3jsoQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/is-fullwidth-code-point": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/is-fullwidth-code-point/-/is-fullwidth-code-point-3.0.0.tgz",
      "integrity": "sha512-zymm5+u+sCsSWyD9qNaejV3DFvhCKclKdizYaJUuHA83RLjb7nSuGnddCHGv0hk+KY7BMAlsWeK4Ueg6EV6XQg==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/is-glob": {
      "version": "4.0.3",
      "resolved": "https://registry.npmjs.org/is-glob/-/is-glob-4.0.3.tgz",
      "integrity": "sha512-xelSayHH36ZgE7ZWhli7pW34hNbNl8Ojv5KVmkJD4hBdD3th8Tfk9vYasLM+mXWOZhFkgZfxhLSnrwRr4elSSg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-extglob": "^2.1.1"
      },
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/is-number": {
      "version": "7.0.0",
      "resolved": "https://registry.npmjs.org/is-number/-/is-number-7.0.0.tgz",
      "integrity": "sha512-41Cifkg6e8TylSpdtTpeLVMqvSBEVzTttHvERD741+pnZ8ANv0004MRL43QKPDlK9cGvNp6NZWZUBlbGXYxxng==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.12.0"
      }
    },
    "node_modules/isexe": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/isexe/-/isexe-2.0.0.tgz",
      "integrity": "sha512-RHxMLp9lnKHGHRng9QFhRCMbYAcVpn69smSGcq3f36xjgVVWThj4qqLbTLlq7Ssj8B+fIQ1EuCEGI2lKsyQeIw==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/json-buffer": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/json-buffer/-/json-buffer-3.0.1.tgz",
      "integrity": "sha512-4bV5BfR2mqfQTJm+V5tPPdf+ZpuhiIvTuAB5g8kcrXOZpTT/QwwVRWBywX1ozr6lEuPdbHxwaJlm9G6mI2sfSQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/json-schema-traverse": {
      "version": "0.4.1",
      "resolved": "https://registry.npmjs.org/json-schema-traverse/-/json-schema-traverse-0.4.1.tgz",
      "integrity": "sha512-xbbCH5dCYU5T8LcEhhuh7HJ88HXuW3qsI3Y0zOZFKfZEHcpWiHU/Jxzk629Brsab/mMiHQti9wMP+845RPe3Vg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/json-stable-stringify-without-jsonify": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/json-stable-stringify-without-jsonify/-/json-stable-stringify-without-jsonify-1.0.1.tgz",
      "integrity": "sha512-Bdboy+l7tA3OGW6FjyFHWkP5LuByj1Tk33Ljyq0axyzdk9//JSi2u3fP1QSmd1KNwq6VOKYGlAu87CisVir6Pw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/keyv": {
      "version": "4.5.4",
      "resolved": "https://registry.npmjs.org/keyv/-/keyv-4.5.4.tgz",
      "integrity": "sha512-oxVHkHR/EJf2CNXnWxRLW6mg7JyCCUcG0DtEGmL2ctUo1PNTin1PUil+r/+4r5MpVgC/fn1kjsx7mjSujKqIpw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "json-buffer": "3.0.1"
      }
    },
    "node_modules/levn": {
      "version": "0.4.1",
      "resolved": "https://registry.npmjs.org/levn/-/levn-0.4.1.tgz",
      "integrity": "sha512-+bT2uH4E5LGE7h/n3evcS/sQlJXCpIp6ym8OWJ5eV6+67Dsql/LaaT7qJBAt2rzfoa/5QBGBhxDix1dMt2kQKQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "prelude-ls": "^1.2.1",
        "type-check": "~0.4.0"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/locate-path": {
      "version": "6.0.0",
      "resolved": "https://registry.npmjs.org/locate-path/-/locate-path-6.0.0.tgz",
      "integrity": "sha512-iPZK6eYjbxRu3uB4/WZ3EsEIMJFMqAoopl3R+zuq0UjcAm/MO6KCweDgPfP3elTztoKP3KtnVHxTn2NHBSDVUw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "p-locate": "^5.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/minimatch": {
      "version": "10.2.4",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-10.2.4.tgz",
      "integrity": "sha512-oRjTw/97aTBN0RHbYCdtF1MQfvusSIBQM0IZEgzl6426+8jSC0nF1a/GmnVLpfB9yyr6g6FTqWqiZVbxrtaCIg==",
      "dev": true,
      "license": "BlueOak-1.0.0",
      "dependencies": {
        "brace-expansion": "^5.0.2"
      },
      "engines": {
        "node": "18 || 20 || >=22"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/ms": {
      "version": "2.1.3",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.1.3.tgz",
      "integrity": "sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/natural-compare": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/natural-compare/-/natural-compare-1.4.0.tgz",
      "integrity": "sha512-OWND8ei3VtNC9h7V60qff3SVobHr996CTwgxubgyQYEpg290h9J0buyECNNJexkFm5sOajh5G116RYA1c8ZMSw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/natural-orderby": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/natural-orderby/-/natural-orderby-5.0.0.tgz",
      "integrity": "sha512-kKHJhxwpR/Okycz4HhQKKlhWe4ASEfPgkSWNmKFHd7+ezuQlxkA5cM3+XkBPvm1gmHen3w53qsYAv+8GwRrBlg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/nconf": {
      "version": "0.13.0",
      "resolved": "https://registry.npmjs.org/nconf/-/nconf-0.13.0.tgz",
      "integrity": "sha512-hJ/u2xCpA663h6xyOiztx3y+lg9eU0rdkwJ+c4FtiHo2g/gB0sjXtW31yTdMLWLOIj1gL2FcJMwfOqouuUK/Wg==",
      "license": "MIT",
      "dependencies": {
        "async": "^3.0.0",
        "ini": "^2.0.0",
        "secure-keys": "^1.0.0",
        "yargs": "^16.1.1"
      },
      "engines": {
        "node": ">= 0.4.0"
      }
    },
    "node_modules/nodemon": {
      "version": "3.1.14",
      "resolved": "https://registry.npmjs.org/nodemon/-/nodemon-3.1.14.tgz",
      "integrity": "sha512-jakjZi93UtB3jHMWsXL68FXSAosbLfY0In5gtKq3niLSkrWznrVBzXFNOEMJUfc9+Ke7SHWoAZsiMkNP3vq6Jw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "chokidar": "^3.5.2",
        "debug": "^4",
        "ignore-by-default": "^1.0.1",
        "minimatch": "^10.2.1",
        "pstree.remy": "^1.1.8",
        "semver": "^7.5.3",
        "simple-update-notifier": "^2.0.0",
        "supports-color": "^5.5.0",
        "touch": "^3.1.0",
        "undefsafe": "^2.0.5"
      },
      "bin": {
        "nodemon": "bin/nodemon.js"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/nodemon"
      }
    },
    "node_modules/normalize-path": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/normalize-path/-/normalize-path-3.0.0.tgz",
      "integrity": "sha512-6eZs5Ls3WtCisHWp9S2GUy8dqkpGi4BVSz3GaqiE6ezub0512ESztXUwUB6C6IKbQkY2Pnb/mD4WYojCRwcwLA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/optionator": {
      "version": "0.9.4",
      "resolved": "https://registry.npmjs.org/optionator/-/optionator-0.9.4.tgz",
      "integrity": "sha512-6IpQ7mKUxRcZNLIObR0hz7lxsapSSIYNZJwXPGeF0mTVqGKFIXj1DQcMoT22S3ROcLyY/rz0PWaWZ9ayWmad9g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "deep-is": "^0.1.3",
        "fast-levenshtein": "^2.0.6",
        "levn": "^0.4.1",
        "prelude-ls": "^1.2.1",
        "type-check": "^0.4.0",
        "word-wrap": "^1.2.5"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/p-limit": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/p-limit/-/p-limit-3.1.0.tgz",
      "integrity": "sha512-TYOanM3wGwNGsZN2cVTYPArw454xnXj5qmWF1bEoAc4+cU/ol7GVh7odevjp1FNHduHc3KZMcFduxU5Xc6uJRQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "yocto-queue": "^0.1.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/p-locate": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/p-locate/-/p-locate-5.0.0.tgz",
      "integrity": "sha512-LaNjtRWUBY++zB5nE/NwcaoMylSPk+S+ZHNB1TzdbMJMny6dynpAGt7X/tl/QYq3TIeE6nxHppbo2LGymrG5Pw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "p-limit": "^3.0.2"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/path-exists": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/path-exists/-/path-exists-4.0.0.tgz",
      "integrity": "sha512-ak9Qy5Q7jYb2Wwcey5Fpvg2KoAc/ZIhLSLOSBmRmygPsGwkVVt0fZa0qrtMz+m6tJTAHfZQ8FnmB4MG4LWy7/w==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/path-key": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/path-key/-/path-key-3.1.1.tgz",
      "integrity": "sha512-ojmeN0qd+y0jszEtoY48r0Peq5dwMEkIlCOu6Q5f41lfkswXuKtYrhgoTpLnyIcHm24Uhqx+5Tqm2InSwLhE6Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/pg": {
      "version": "8.20.0",
      "resolved": "https://registry.npmjs.org/pg/-/pg-8.20.0.tgz",
      "integrity": "sha512-ldhMxz2r8fl/6QkXnBD3CR9/xg694oT6DZQ2s6c/RI28OjtSOpxnPrUCGOBJ46RCUxcWdx3p6kw/xnDHjKvaRA==",
      "license": "MIT",
      "dependencies": {
        "pg-connection-string": "^2.12.0",
        "pg-pool": "^3.13.0",
        "pg-protocol": "^1.13.0",
        "pg-types": "2.2.0",
        "pgpass": "1.0.5"
      },
      "engines": {
        "node": ">= 16.0.0"
      },
      "optionalDependencies": {
        "pg-cloudflare": "^1.3.0"
      },
      "peerDependencies": {
        "pg-native": ">=3.0.1"
      },
      "peerDependenciesMeta": {
        "pg-native": {
          "optional": true
        }
      }
    },
    "node_modules/pg-cloudflare": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/pg-cloudflare/-/pg-cloudflare-1.3.0.tgz",
      "integrity": "sha512-6lswVVSztmHiRtD6I8hw4qP/nDm1EJbKMRhf3HCYaqud7frGysPv7FYJ5noZQdhQtN2xJnimfMtvQq21pdbzyQ==",
      "license": "MIT",
      "optional": true
    },
    "node_modules/pg-connection-string": {
      "version": "2.12.0",
      "resolved": "https://registry.npmjs.org/pg-connection-string/-/pg-connection-string-2.12.0.tgz",
      "integrity": "sha512-U7qg+bpswf3Cs5xLzRqbXbQl85ng0mfSV/J0nnA31MCLgvEaAo7CIhmeyrmJpOr7o+zm0rXK+hNnT5l9RHkCkQ==",
      "license": "MIT"
    },
    "node_modules/pg-int8": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/pg-int8/-/pg-int8-1.0.1.tgz",
      "integrity": "sha512-WCtabS6t3c8SkpDBUlb1kjOs7l66xsGdKpIPZsg4wR+B3+u9UAum2odSsF9tnvxg80h4ZxLWMy4pRjOsFIqQpw==",
      "license": "ISC",
      "engines": {
        "node": ">=4.0.0"
      }
    },
    "node_modules/pg-pool": {
      "version": "3.13.0",
      "resolved": "https://registry.npmjs.org/pg-pool/-/pg-pool-3.13.0.tgz",
      "integrity": "sha512-gB+R+Xud1gLFuRD/QgOIgGOBE2KCQPaPwkzBBGC9oG69pHTkhQeIuejVIk3/cnDyX39av2AxomQiyPT13WKHQA==",
      "license": "MIT",
      "peerDependencies": {
        "pg": ">=8.0"
      }
    },
    "node_modules/pg-protocol": {
      "version": "1.13.0",
      "resolved": "https://registry.npmjs.org/pg-protocol/-/pg-protocol-1.13.0.tgz",
      "integrity": "sha512-zzdvXfS6v89r6v7OcFCHfHlyG/wvry1ALxZo4LqgUoy7W9xhBDMaqOuMiF3qEV45VqsN6rdlcehHrfDtlCPc8w==",
      "license": "MIT"
    },
    "node_modules/pg-types": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/pg-types/-/pg-types-2.2.0.tgz",
      "integrity": "sha512-qTAAlrEsl8s4OiEQY69wDvcMIdQN6wdz5ojQiOy6YRMuynxenON0O5oCpJI6lshc6scgAY8qvJ2On/p+CXY0GA==",
      "license": "MIT",
      "dependencies": {
        "pg-int8": "1.0.1",
        "postgres-array": "~2.0.0",
        "postgres-bytea": "~1.0.0",
        "postgres-date": "~1.0.4",
        "postgres-interval": "^1.1.0"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/pgpass": {
      "version": "1.0.5",
      "resolved": "https://registry.npmjs.org/pgpass/-/pgpass-1.0.5.tgz",
      "integrity": "sha512-FdW9r/jQZhSeohs1Z3sI1yxFQNFvMcnmfuj4WBMUTxOrAyLMaTcE1aAMBiTlbMNaXvBCQuVi0R7hd8udDSP7ug==",
      "license": "MIT",
      "dependencies": {
        "split2": "^4.1.0"
      }
    },
    "node_modules/picomatch": {
      "version": "2.3.1",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-2.3.1.tgz",
      "integrity": "sha512-JU3teHTNjmE2VCGFzuY8EXzCDVwEqB2a8fsIvwaStHhAWJEeVd1o1QD80CU6+ZdEXXSLbSsuLwJjkCBWqRQUVA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8.6"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/postgres-array": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/postgres-array/-/postgres-array-2.0.0.tgz",
      "integrity": "sha512-VpZrUqU5A69eQyW2c5CA1jtLecCsN2U/bD6VilrFDWq5+5UIEVO7nazS3TEcHf1zuPYO/sqGvUvW62g86RXZuA==",
      "license": "MIT",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/postgres-bytea": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/postgres-bytea/-/postgres-bytea-1.0.1.tgz",
      "integrity": "sha512-5+5HqXnsZPE65IJZSMkZtURARZelel2oXUEO8rH83VS/hxH5vv1uHquPg5wZs8yMAfdv971IU+kcPUczi7NVBQ==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/postgres-date": {
      "version": "1.0.7",
      "resolved": "https://registry.npmjs.org/postgres-date/-/postgres-date-1.0.7.tgz",
      "integrity": "sha512-suDmjLVQg78nMK2UZ454hAG+OAW+HQPZ6n++TNDUX+L0+uUlLywnoxJKDou51Zm+zTCjrCl0Nq6J9C5hP9vK/Q==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/postgres-interval": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/postgres-interval/-/postgres-interval-1.2.0.tgz",
      "integrity": "sha512-9ZhXKM/rw350N1ovuWHbGxnGh/SNJ4cnxHiM0rxE4VN41wsg8P8zWn9hv/buK00RP4WvlOyr/RBDiptyxVbkZQ==",
      "license": "MIT",
      "dependencies": {
        "xtend": "^4.0.0"
      },
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/prelude-ls": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/prelude-ls/-/prelude-ls-1.2.1.tgz",
      "integrity": "sha512-vkcDPrRZo1QZLbn5RLGPpg/WmIQ65qoWWhcGKf/b5eplkkarX0m9z8ppCat4mlOqUsWpyNuYgO3VRyrYHSzX5g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/prettier": {
      "version": "3.8.1",
      "resolved": "https://registry.npmjs.org/prettier/-/prettier-3.8.1.tgz",
      "integrity": "sha512-UOnG6LftzbdaHZcKoPFtOcCKztrQ57WkHDeRD9t/PTQtmT0NHSeWWepj6pS0z/N7+08BHFDQVUrfmfMRcZwbMg==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "prettier": "bin/prettier.cjs"
      },
      "engines": {
        "node": ">=14"
      },
      "funding": {
        "url": "https://github.com/prettier/prettier?sponsor=1"
      }
    },
    "node_modules/prettier-linter-helpers": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/prettier-linter-helpers/-/prettier-linter-helpers-1.0.1.tgz",
      "integrity": "sha512-SxToR7P8Y2lWmv/kTzVLC1t/GDI2WGjMwNhLLE9qtH8Q13C+aEmuRlzDst4Up4s0Wc8sF2M+J57iB3cMLqftfg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fast-diff": "^1.1.2"
      },
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/pstree.remy": {
      "version": "1.1.8",
      "resolved": "https://registry.npmjs.org/pstree.remy/-/pstree.remy-1.1.8.tgz",
      "integrity": "sha512-77DZwxQmxKnu3aR542U+X8FypNzbfJ+C5XQDk3uWjWxn6151aIMGthWYRXTqT1E5oJvg+ljaa2OJi+VfvCOQ8w==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/punycode": {
      "version": "2.3.1",
      "resolved": "https://registry.npmjs.org/punycode/-/punycode-2.3.1.tgz",
      "integrity": "sha512-vYt7UD1U9Wg6138shLtLOvdAu+8DsC/ilFtEVHcH+wydcSpNE20AfSOduf6MkRFahL5FY7X1oU7nKVZFtfq8Fg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/readdirp": {
      "version": "3.6.0",
      "resolved": "https://registry.npmjs.org/readdirp/-/readdirp-3.6.0.tgz",
      "integrity": "sha512-hOS089on8RduqdbhvQ5Z37A0ESjsqz6qnRcffsMU3495FuTdqSm+7bhJ29JvIOsBDEEnan5DPu9t3To9VRlMzA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "picomatch": "^2.2.1"
      },
      "engines": {
        "node": ">=8.10.0"
      }
    },
    "node_modules/require-directory": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/require-directory/-/require-directory-2.1.1.tgz",
      "integrity": "sha512-fGxEI7+wsG9xrvdjsrlmL22OMTTiHRwAMroiEeMgq8gzoLC/PQr7RsRDSTLUg/bZAZtF+TVIkHc6/4RIKrui+Q==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/secure-keys": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/secure-keys/-/secure-keys-1.0.0.tgz",
      "integrity": "sha512-nZi59hW3Sl5P3+wOO89eHBAAGwmCPd2aE1+dLZV5MO+ItQctIvAqihzaAXIQhvtH4KJPxM080HsnqltR2y8cWg==",
      "license": "MIT"
    },
    "node_modules/semver": {
      "version": "7.7.4",
      "resolved": "https://registry.npmjs.org/semver/-/semver-7.7.4.tgz",
      "integrity": "sha512-vFKC2IEtQnVhpT78h1Yp8wzwrf8CM+MzKMHGJZfBtzhZNycRFnXsHk6E5TxIkkMsgNS7mdX3AGB7x2QM2di4lA==",
      "dev": true,
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/shebang-command": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/shebang-command/-/shebang-command-2.0.0.tgz",
      "integrity": "sha512-kHxr2zZpYtdmrN1qDjrrX/Z1rR1kG8Dx+gkpK1G4eXmvXswmcE1hTWBWYUzlraYw1/yZp6YuDY77YtvbN0dmDA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "shebang-regex": "^3.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/shebang-regex": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/shebang-regex/-/shebang-regex-3.0.0.tgz",
      "integrity": "sha512-7++dFhtcx3353uBaq8DDR4NuxBetBzC7ZQOhmTQInHEd6bSrXdiEyzCvG07Z44UYdLShWUyXt5M/yhz8ekcb1A==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/simple-update-notifier": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/simple-update-notifier/-/simple-update-notifier-2.0.0.tgz",
      "integrity": "sha512-a2B9Y0KlNXl9u/vsW6sTIu9vGEpfKu2wRV6l1H3XEas/0gUIzGzBoP/IouTcUQbm9JWZLH3COxyn03TYlFax6w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "semver": "^7.5.3"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/split2": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/split2/-/split2-4.2.0.tgz",
      "integrity": "sha512-UcjcJOWknrNkF6PLX83qcHM6KHgVKNkV62Y8a5uYDVv9ydGQVwAHMKqHdJje1VTWpljG0WYpCDhrCdAOYH4TWg==",
      "license": "ISC",
      "engines": {
        "node": ">= 10.x"
      }
    },
    "node_modules/string-width": {
      "version": "4.2.3",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-4.2.3.tgz",
      "integrity": "sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g==",
      "license": "MIT",
      "dependencies": {
        "emoji-regex": "^8.0.0",
        "is-fullwidth-code-point": "^3.0.0",
        "strip-ansi": "^6.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/strip-ansi": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-6.0.1.tgz",
      "integrity": "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==",
      "license": "MIT",
      "dependencies": {
        "ansi-regex": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/supports-color": {
      "version": "5.5.0",
      "resolved": "https://registry.npmjs.org/supports-color/-/supports-color-5.5.0.tgz",
      "integrity": "sha512-QjVjwdXIt408MIiAqCX4oUKsgU2EqAGzs2Ppkm4aQYbjm+ZEWEcW4SfFNTr4uMNZma0ey4f5lgLrkB0aX0QMow==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "has-flag": "^3.0.0"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/synckit": {
      "version": "0.11.12",
      "resolved": "https://registry.npmjs.org/synckit/-/synckit-0.11.12.tgz",
      "integrity": "sha512-Bh7QjT8/SuKUIfObSXNHNSK6WHo6J1tHCqJsuaFDP7gP0fkzSfTxI8y85JrppZ0h8l0maIgc2tfuZQ6/t3GtnQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@pkgr/core": "^0.2.9"
      },
      "engines": {
        "node": "^14.18.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/synckit"
      }
    },
    "node_modules/tinyglobby": {
      "version": "0.2.15",
      "resolved": "https://registry.npmjs.org/tinyglobby/-/tinyglobby-0.2.15.tgz",
      "integrity": "sha512-j2Zq4NyQYG5XMST4cbs02Ak8iJUdxRM0XI5QyxXuZOzKOINmWurp3smXu3y5wDcJrptwpSjgXHzIQxR0omXljQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fdir": "^6.5.0",
        "picomatch": "^4.0.3"
      },
      "engines": {
        "node": ">=12.0.0"
      },
      "funding": {
        "url": "https://github.com/sponsors/SuperchupuDev"
      }
    },
    "node_modules/tinyglobby/node_modules/fdir": {
      "version": "6.5.0",
      "resolved": "https://registry.npmjs.org/fdir/-/fdir-6.5.0.tgz",
      "integrity": "sha512-tIbYtZbucOs0BRGqPJkshJUYdL+SDH7dVM8gjy+ERp3WAUjLEFJE+02kanyHtwjWOnwrKYBiwAmM0p4kLJAnXg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12.0.0"
      },
      "peerDependencies": {
        "picomatch": "^3 || ^4"
      },
      "peerDependenciesMeta": {
        "picomatch": {
          "optional": true
        }
      }
    },
    "node_modules/tinyglobby/node_modules/picomatch": {
      "version": "4.0.3",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-4.0.3.tgz",
      "integrity": "sha512-5gTmgEY/sqK6gFXLIsQNH19lWb4ebPDLA4SdLP7dsWkIXHWlG66oPuVvXSGFPppYZz8ZDZq0dYYrbHfBCVUb1Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/to-regex-range": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/to-regex-range/-/to-regex-range-5.0.1.tgz",
      "integrity": "sha512-65P7iz6X5yEr1cwcgvQxbbIw7Uk3gOy5dIdtZ4rDveLqhrdJP+Li/Hx6tyK0NEb+2GCyneCMJiGqrADCSNk8sQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-number": "^7.0.0"
      },
      "engines": {
        "node": ">=8.0"
      }
    },
    "node_modules/touch": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/touch/-/touch-3.1.1.tgz",
      "integrity": "sha512-r0eojU4bI8MnHr8c5bNo7lJDdI2qXlWWJk6a9EAFG7vbhTjElYhBVS3/miuE0uOuoLdb8Mc/rVfsmm6eo5o9GA==",
      "dev": true,
      "license": "ISC",
      "bin": {
        "nodetouch": "bin/nodetouch.js"
      }
    },
    "node_modules/ts-api-utils": {
      "version": "2.5.0",
      "resolved": "https://registry.npmjs.org/ts-api-utils/-/ts-api-utils-2.5.0.tgz",
      "integrity": "sha512-OJ/ibxhPlqrMM0UiNHJ/0CKQkoKF243/AEmplt3qpRgkW8VG7IfOS41h7V8TjITqdByHzrjcS/2si+y4lIh8NA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18.12"
      },
      "peerDependencies": {
        "typescript": ">=4.8.4"
      }
    },
    "node_modules/tweetnacl": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/tweetnacl/-/tweetnacl-1.0.3.tgz",
      "integrity": "sha512-6rt+RN7aOi1nGMyC4Xa5DdYiukl2UWCbcJft7YhxReBGQD7OAM8Pbxw6YMo4r2diNEA8FEmu32YOn9rhaiE5yw==",
      "license": "Unlicense"
    },
    "node_modules/type-check": {
      "version": "0.4.0",
      "resolved": "https://registry.npmjs.org/type-check/-/type-check-0.4.0.tgz",
      "integrity": "sha512-XleUoc9uwGXqjWwXaUTZAmzMcFZ5858QA2vvx1Ur5xIcixXIP+8LnFDgRplU30us6teqdlskFfu+ae4K79Ooew==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "prelude-ls": "^1.2.1"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/typescript": {
      "version": "5.9.3",
      "resolved": "https://registry.npmjs.org/typescript/-/typescript-5.9.3.tgz",
      "integrity": "sha512-jl1vZzPDinLr9eUt3J/t7V6FgNEw9QjvBPdysz9KfQDD41fQrC2Y4vKQdiaUpFT4bXlb1RHhLpp8wtm6M5TgSw==",
      "dev": true,
      "license": "Apache-2.0",
      "peer": true,
      "bin": {
        "tsc": "bin/tsc",
        "tsserver": "bin/tsserver"
      },
      "engines": {
        "node": ">=14.17"
      }
    },
    "node_modules/undefsafe": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/undefsafe/-/undefsafe-2.0.5.tgz",
      "integrity": "sha512-WxONCrssBM8TSPRqN5EmsjVrsv4A8X12J4ArBiiayv3DyyG3ZlIg6yysuuSYdZsVz3TKcTg2fd//Ujd4CHV1iA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/undici-types": {
      "version": "7.18.2",
      "resolved": "https://registry.npmjs.org/undici-types/-/undici-types-7.18.2.tgz",
      "integrity": "sha512-AsuCzffGHJybSaRrmr5eHr81mwJU3kjw6M+uprWvCXiNeN9SOGwQ3Jn8jb8m3Z6izVgknn1R0FTCEAP2QrLY/w==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/uri-js": {
      "version": "4.4.1",
      "resolved": "https://registry.npmjs.org/uri-js/-/uri-js-4.4.1.tgz",
      "integrity": "sha512-7rKUyy33Q1yc98pQ1DAmLtwX109F7TIfWlW1Ydo8Wl1ii1SeHieeh0HHfPeL2fMXK6z0s8ecKs9frCuLJvndBg==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "punycode": "^2.1.0"
      }
    },
    "node_modules/which": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/which/-/which-2.0.2.tgz",
      "integrity": "sha512-BLI3Tl1TW3Pvl70l3yq3Y64i+awpwXqsGBYWkkqMtnbXgrMD+yj7rhW0kuEDxzJaYXGjEW5ogapKNMEKNMjibA==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "isexe": "^2.0.0"
      },
      "bin": {
        "node-which": "bin/node-which"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/word-wrap": {
      "version": "1.2.5",
      "resolved": "https://registry.npmjs.org/word-wrap/-/word-wrap-1.2.5.tgz",
      "integrity": "sha512-BN22B5eaMMI9UMtjrGd5g5eCYPpCPDUy0FJXbYsaT5zYxjFOckS53SQDE3pWkVoWpHXVb3BrYcEN4Twa55B5cA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/wrap-ansi": {
      "version": "7.0.0",
      "resolved": "https://registry.npmjs.org/wrap-ansi/-/wrap-ansi-7.0.0.tgz",
      "integrity": "sha512-YVGIj2kamLSTxw6NsZjoBxfSwsn0ycdesmc4p+Q21c5zPuZ1pl+NfxVdxPtdHvmNVOQ6XSYG4AUtyt/Fi7D16Q==",
      "license": "MIT",
      "dependencies": {
        "ansi-styles": "^4.0.0",
        "string-width": "^4.1.0",
        "strip-ansi": "^6.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/chalk/wrap-ansi?sponsor=1"
      }
    },
    "node_modules/xtend": {
      "version": "4.0.2",
      "resolved": "https://registry.npmjs.org/xtend/-/xtend-4.0.2.tgz",
      "integrity": "sha512-LKYU1iAXJXUgAXn9URjiu+MWhyUXHsvfp7mcuYm9dSUKK0/CjtrUwFAxD82/mCWbtLsGjFIad0wIsod4zrTAEQ==",
      "license": "MIT",
      "engines": {
        "node": ">=0.4"
      }
    },
    "node_modules/y18n": {
      "version": "5.0.8",
      "resolved": "https://registry.npmjs.org/y18n/-/y18n-5.0.8.tgz",
      "integrity": "sha512-0pfFzegeDWJHJIAmTLRP2DwHjdF5s7jo9tuztdQxAhINCdvS+3nGINqPd00AphqJR/0LhANUS6/+7SCb98YOfA==",
      "license": "ISC",
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/yargs": {
      "version": "16.2.0",
      "resolved": "https://registry.npmjs.org/yargs/-/yargs-16.2.0.tgz",
      "integrity": "sha512-D1mvvtDG0L5ft/jGWkLpG1+m0eQxOfaBvTNELraWj22wSVUMWxZUvYgJYcKh6jGGIkJFhH4IZPQhR4TKpc8mBw==",
      "license": "MIT",
      "dependencies": {
        "cliui": "^7.0.2",
        "escalade": "^3.1.1",
        "get-caller-file": "^2.0.5",
        "require-directory": "^2.1.1",
        "string-width": "^4.2.0",
        "y18n": "^5.0.5",
        "yargs-parser": "^20.2.2"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/yargs-parser": {
      "version": "20.2.9",
      "resolved": "https://registry.npmjs.org/yargs-parser/-/yargs-parser-20.2.9.tgz",
      "integrity": "sha512-y11nGElTIV+CT3Zv9t7VKl+Q3hTQoT9a1Qzezhhl6Rp21gJ/IVTW7Z3y9EWXhuUBC2Shnf+DX0antecpAwSP8w==",
      "license": "ISC",
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/yocto-queue": {
      "version": "0.1.0",
      "resolved": "https://registry.npmjs.org/yocto-queue/-/yocto-queue-0.1.0.tgz",
      "integrity": "sha512-rVksvsnNCdJ/ohGc6xgPwyN8eheCxsiLM8mxuE/t/mOVqJewPuO1miLpTHQiRgTKCLexL4MeAFVagts7HmNZ2Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    }
  }
}
```

## domains/auth/auth-worker/package.json
```
{
  "name": "auth-worker",
  "private": true,
  "overrides": {
    "minimatch": "^10.2.4",
    "glob": "^13.0.6"
  },
  "dependencies": {
    "@nats-io/jetstream": "^3.3.1",
    "@nats-io/transport-node": "^3.3.1",
    "nconf": "^0.13.0",
    "pg": "^8.18.0"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@types/eslint-config-prettier": "^6.11.3",
    "@types/nconf": "^0.10.7",
    "@types/node": "^25.3.0",
    "eslint": "^10.0.1",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-perfectionist": "^5.6.0",
    "eslint-plugin-prettier": "^5.5.5",
    "globals": "^17.3.0",
    "nodemon": "^3.1.14",
    "prettier": "^3.8.1"
  }
}
```

## domains/auth/auth-worker/prettier.config.mjs
```
/**
 * @see https://prettier.io/docs/en/configuration.html
 * @type {import("./node_modules/prettier/index.d.ts").Config}
 */
export default {};

// https://github.com/prettier/prettier-vscode/issues/3378
```

## domains/auth/auth-worker/src/consumers/auth.mjs
```
import { jetstream } from "@nats-io/jetstream";

/**
 * @param {import('@nats-io/transport-node').NatsConnection} nc
 */
export async function startAuthConsumer(nc) {
  const c = await jetstream(nc).consumers.get("auth", "auth-worker");
  const it = await c.consume({ max_messages: 1 });

  let running = true;

  // We need to run it in the background, otherwise the return will not be reached
  (async () => {
    for await (const m of it) {
      if (!running) break;
      await handleAuthEvent(m);
    }
  })();

  return async () => {
    running = false;
    it.stop();
  };
}

/**
 *
 * @param {import('@nats-io/jetstream').JsMsg} msg
 */
async function handleAuthEvent(msg) {
  console.log(msg.subject);
  msg.ack();
}
```

## domains/auth/auth-worker/src/index.mjs
```
import nconf from "nconf";

nconf
  .env()
  .required(["DATABASE_URL", "NATS_URL", "NATS_USER", "NATS_PASSWORD"]);

import("./worker.mjs");
```

## domains/auth/auth-worker/src/worker.mjs
```
import { connect } from "@nats-io/transport-node";
import nconf from "nconf";
import { Pool } from "pg";

import { startAuthConsumer } from "./consumers/auth.mjs";

const pool = new Pool({
  connectionString: nconf.get("DATABASE_URL"),
  connectionTimeoutMillis: 2000,
  // https://node-postgres.com/apis/pool
  // max_connections on postgres = 100,
  //  minus 80 for auth-api = 20
  //  budget for auth-worker = 20 * 75% = 15
  //  per auth-worker replica = 15 / 3 replicas = 5
  max: 5,
});

const nc = await connect({
  name: "auth-api",
  servers: [nconf.get("NATS_URL")],
});

const stopAuthConsumer = await startAuthConsumer(nc);

console.log("listening");

let shutdownInitiated = false;

["SIGINT", "SIGTERM", "SIGUSR2"].forEach((signal) =>
  process.on(signal, async () => {
    if (shutdownInitiated) return;
    shutdownInitiated = true;

    console.log("shutdown initiated");

    try {
      console.log("stopping auth consumer...");
      await stopAuthConsumer();
    } catch (err) {
      console.error("error stopping auth consumer", err);
    }

    try {
      if (!nc.isClosed()) {
        console.log("draining nats...");
        await nc.drain();
        await nc.closed();
      }
    } catch (err) {
      console.error("error draining nats", err);
    }

    try {
      console.log("closing postgres pool...");
      await pool.end();
    } catch (err) {
      console.error("error closing pg pool", err);
    }

    console.log("shutdown complete");
    process.exit(0);
  }),
);
```

## domains/auth/infra/base/auth-api-depl.yaml
```
apiVersion: apps/v1
kind: Deployment

metadata:
  name: auth-api-depl
spec:
  selector:
    matchLabels:
      app: auth-api
  replicas: 3
  template:
    metadata:
      labels:
        app: auth-api
    spec:
      serviceAccountName: auth-api
      # Defense in deep, disable this at the pod level
      # to prevent overwrites at the service account level
      automountServiceAccountToken: false

      containers:
        - name: auth-api
          image: mdstaicu/auth-api
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: auth-db
                  key: DATABASE_URL

            - name: ORIGIN
              valueFrom:
                configMapKeyRef:
                  name: auth-api-cm
                  key: ORIGIN

            - name: JWT_PRIVATE_KEY_PATH
              value: /app/keys/jwt-private.pem
            - name: JWT_PUBLIC_KEY_PATH
              value: /app/keys/jwt-public.pem

            # Clients will learn the cluster topology, use the ClientIP hostname
            - name: NATS_URL
              value: nats://nats-srv.nats.svc.cluster.local:4222
            # - name: NATS_USER
            #   valueFrom:
            #     secretKeyRef:
            #       name: auth-api-nats-creds
            #       key: user
            # - name: NATS_PASSWORD
            #   valueFrom:
            #     secretKeyRef:
            #       name: auth-api-nats-creds
            #       key: password

            - name: OTEL_SERVICE_NAME
              value: auth-api

            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: http://otel-srv.otel.svc.cluster.local:4318

            - name: OTEL_METRICS_EXPORTER
              value: none

            - name: OTEL_LOGS_EXPORTER
              value: none

          volumeMounts:
            - name: auth-api-jwt
              mountPath: /app/keys
              readOnly: true

          #
          # total probe time =
          #     initialDelay + timeout + ( (periodSeconds + timeout) * (failureThreshold - 1) )
          #
          readinessProbe:
            httpGet:
              path: /readyz
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 1
            failureThreshold: 2

          livenessProbe:
            httpGet:
              path: /healthz
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 1
            failureThreshold: 2

      volumes:
        - name: auth-api-jwt
          secret:
            secretName: auth-api-jwt
```

## domains/auth/infra/base/auth-api-sa.yaml
```
apiVersion: v1
kind: ServiceAccount

metadata:
  name: auth-api
automountServiceAccountToken: false
```

## domains/auth/infra/base/auth-api-srv.yaml
```
apiVersion: v1
kind: Service

metadata:
  name: auth-api-srv
spec:
  selector:
    app: auth-api
  ports:
    - name: auth-api
      port: 3000
      targetPort: 3000
```

## domains/auth/infra/base/auth-ingress.yaml
```
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute

metadata:
  name: auth-api-public
spec:
  parentRefs:
    - name: traefik-pgw
      namespace: traefik

  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /auth/v1/passkeys

      filters:
        - type: URLRewrite
          urlRewrite:
            path:
              type: ReplacePrefixMatch
              replacePrefixMatch: /v1/passkeys

      backendRefs:
        - name: auth-api-srv
          port: 3000

    - matches:
        - path:
            type: PathPrefix
            value: /auth/v1/sessions/refresh

      filters:
        - type: URLRewrite
          urlRewrite:
            path:
              type: ReplacePrefixMatch
              replacePrefixMatch: /v1/sessions/refresh

      backendRefs:
        - name: auth-api-srv
          port: 3000

---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute

metadata:
  name: auth-jwks-public
spec:
  parentRefs:
    - name: traefik-pgw
      namespace: traefik

  rules:
    - matches:
        - path:
            type: Exact
            value: /.well-known/jwks.json

      backendRefs:
        - name: auth-api-srv
          port: 3000

---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute

metadata:
  name: auth-api-internal
spec:
  parentRefs:
    - name: traefik-igw
      namespace: traefik

  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /auth/v1

      filters:
        - type: URLRewrite
          urlRewrite:
            path:
              type: ReplacePrefixMatch
              replacePrefixMatch: /v1

      backendRefs:
        - name: auth-api-srv
          port: 3000

---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute

metadata:
  name: auth-jwks-internal
spec:
  parentRefs:
    - name: traefik-igw
      namespace: traefik

  rules:
    - matches:
        - path:
            type: Exact
            value: /.well-known/jwks.json

      backendRefs:
        - name: auth-api-srv
          port: 3000
```

## domains/auth/infra/base/auth-np.yaml
```
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy

metadata:
  name: default-deny
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy

metadata:
  name: allow-dns
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy

metadata:
  name: allow-traefik-to-auth-api
spec:
  podSelector:
    matchLabels:
      app: auth-api
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: traefik
          podSelector:
            matchLabels:
              app: traefik
      ports:
        - protocol: TCP
          port: 3000
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy

metadata:
  name: allow-traefik-to-auth-ui
spec:
  podSelector:
    matchLabels:
      app: auth-ui
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: traefik
          podSelector:
            matchLabels:
              app: traefik
      ports:
        - protocol: TCP
          port: 3000
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy

metadata:
  name: allow-auth-ui-egress-to-traefik-http-auth
spec:
  podSelector:
    matchLabels:
      app: auth-ui
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: traefik
          podSelector:
            matchLabels:
              app: traefik
      ports:
        - protocol: TCP
          port: 80 # <-- ONLY auth internal entrypoint
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy

metadata:
  name: allow-auth-api-to-nats
spec:
  podSelector:
    matchLabels:
      app: auth-api
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: nats
          podSelector:
            matchLabels:
              app: nats
      ports:
        - protocol: TCP
          port: 4222
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy

metadata:
  name: allow-auth-worker-to-nats
spec:
  podSelector:
    matchLabels:
      app: auth-worker
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: nats
          podSelector:
            matchLabels:
              app: nats
      ports:
        - protocol: TCP
          port: 4222
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-auth-api-to-postgres
  namespace: auth
spec:
  podSelector:
    matchLabels:
      app: auth-api
  policyTypes:
    - Egress
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: auth-postgres
      ports:
        - protocol: TCP
          port: 5432
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy

metadata:
  name: allow-auth-worker-to-postgres
spec:
  podSelector:
    matchLabels:
      app: auth-worker
  policyTypes:
    - Egress
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: auth-postgres
      ports:
        - protocol: TCP
          port: 5432
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy

metadata:
  name: allow-postgres-from-auth
spec:
  podSelector:
    matchLabels:
      app: auth-postgres
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: auth-api
        - podSelector:
            matchLabels:
              app: auth-worker
      ports:
        - protocol: TCP
          port: 5432
```

## domains/auth/infra/base/auth-ns.yaml
```
apiVersion: v1
kind: Namespace

metadata:
  name: auth
```

## domains/auth/infra/base/auth-worker-depl.yaml
```
apiVersion: apps/v1
kind: Deployment

metadata:
  name: auth-worker-depl
spec:
  selector:
    matchLabels:
      app: auth-worker
  replicas: 1
  template:
    metadata:
      labels:
        app: auth-worker
    spec:
      serviceAccountName: auth-worker
      # Defense in deep, disable this at the pod level to prevent overwrites at the
      # service account level
      automountServiceAccountToken: false

      containers:
        - name: auth-worker
          image: mdstaicu/auth-worker
          env:
            - name: NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace

            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: auth-db
                  key: DATABASE_URL

            # Clients will learn the cluster topology, use the ClientIP hostname
            - name: NATS_URL
              value: nats://nats-srv.nats.svc.cluster.local:4222
            # - name: NATS_USER
            #   valueFrom:
            #     secretKeyRef:
            #       name: auth-worker-nats-secrets
            #       key: user
            # - name: NATS_PASSWORD
            #   valueFrom:
            #     secretKeyRef:
            #       name: auth-worker-nats-secrets
            #       key: password
```

## domains/auth/infra/base/auth-worker-sa.yaml
```
apiVersion: v1
kind: ServiceAccount

metadata:
  name: auth-worker
automountServiceAccountToken: false
```

## domains/auth/infra/base/kustomization.yaml
```
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - auth-api-depl.yaml
  - auth-api-sa.yaml
  - auth-api-srv.yaml
  - auth-ingress.yaml
  # - auth-np.yaml
  - auth-ns.yaml
  # - auth-worker-depl.yaml
  # - auth-worker-sa.yaml```

## domains/auth/infra/overlays/cluster/auth-api-depl.yaml
```
apiVersion: apps/v1
kind: Deployment

metadata:
  name: auth-api-depl
spec:
  template:
    spec:
      containers:
        - name: auth-api
          securityContext:
            runAsNonRoot: true
            # This will override the Docker image USER
            # if you get this right, there will be issues
            # uncommenting this to let the Dockerfile decide the USER
            runAsUser: 1000
            runAsGroup: 1000

            allowPrivilegeEscalation: false

            # Node sometimes writes to:
            #   /tmp
            #   $HOME
            #   npm cache
            # If your app ever crashes with:
            #   EROFS: read-only file system
            # You need to mount writable tmp.

            # volumeMounts:
            #   - name: tmp
            #     mountPath: /tmp
            # volumes:
            #   - name: tmp
            #     emptyDir: {}

            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
            seccompProfile:
              type: RuntimeDefault

          volumeMounts:
            - name: auth-api-jwt
              mountPath: /app/keys
              readOnly: true

          #
          # total probe time =
          #     initialDelay + timeout + ( (periodSeconds + timeout) * (failureThreshold - 1) )
          #
          readinessProbe:
            httpGet:
              path: /readyz
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 1
            failureThreshold: 2

          livenessProbe:
            httpGet:
              path: /healthz
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 1
            failureThreshold: 2

      volumes:
        - name: auth-api-jwt
          secret:
            secretName: auth-api-jwt
```

## domains/auth/infra/overlays/cluster/auth-api-ingress.yaml
```
apiVersion: traefik.io/v1alpha1
kind: IngressRoute

metadata:
  name: auth-api
spec:
  entryPoints:
    - https
  routes:
    - match: Host(`tma.com`) && PathPrefix(`/api/v1/auth`)
      kind: Rule
      priority: 69
      middlewares:
        - name: auth-api-strip-prefix
      services:
        - name: auth-api-srv
          port: 3000
  tls:
    certResolver: letsencrypt
```

## domains/auth/infra/overlays/cluster/auth-api-jwt.yaml
```
apiVersion: v1
kind: Secret
metadata:
    name: auth-api-jwt
data:
    jwt-private.pem: ENC[AES256_GCM,data:nYJxeGsdvIenfpFCmzBmEovfadP2bqRkf17KBIAxP4Da7Um18L4jgTr+OYg+sxrTmxgCAicVVhRCrROG2yDKOjsq766EOLGKBnzOH2o5FPKlhxIT0U9ssuaxSCNA0Zo1EDLc6qZ2mmcy0U47Ps1AuVUtJ9dh6zkQFiBJBf87sCbgY85Rm9s4aUVDZlECbdrKsWCkBvYNXz8riy1r5wkVgntSkEPQ3+VzggNMHqrWLcpEfNfH6K9hwnHYPY9sYcPlHIltqGqieJ5So9dYLs4K1K39/VRE005lbrPMQD78FdfLcsQfIQzNRK2vmWKp0sHbxqNuEiG7F2RkZU3smFxKuIw8W8ywV5V6arhCT5T030LENag1lCfoXLid8u5l9Lw1cKvY5pbpWBW8CzyYH8FJYJAAtpjJasamf7c5K9vt9vqoJfGP,iv:sUT9S7Gk1LGpJim5OMOQcRSmX4xg+mHq87rqKLEqwAI=,tag:6KwVcNVxHu16RKbY8UxXaQ==,type:str]
    jwt-public.pem: ENC[AES256_GCM,data:37gsU2UeUt0WkK0o/WCuui1x/g0JfRYgi80Y9j3RQj5hWPvys8GBaLI6MBRTPyM+0nRJgE4hG6+x5MADkCwXOvj7TXIm/uwFQWpMzejsbmqjywCE8+dnasCZZ5z6oPCBMUPaYvb2F9UTekDKpU+eWYCqrWe/uBuH3gCf9ilH+dF9yCmzeDhC8PWO/xe8xTKbeCAS2pJ7TOj0owWoZb5MwimryzmhlpVfJlvCEDaPorqGvK3QHYBmxHWcb67JTksjJo1zofdIipNZMWrXO7RravVyE9q5Eiz2fXQFQ73cXuoWGtzwVT+giXTPH+OU/v3K,iv:xAsiiEehOWxzon2Uadz51A98Ods9EiFeTTpdnAFoZnc=,tag:SoDi6ZGUrs2N2j7YZZ9zIA==,type:str]
sops:
    age:
        - recipient: age1m0848yekwnxypu3te3n55845z9mmve8qvu0dqfgs34jgn87meaksdvkyu0
          enc: |
            -----BEGIN AGE ENCRYPTED FILE-----
            YWdlLWVuY3J5cHRpb24ub3JnL3YxCi0+IFgyNTUxOSB2M3lJYWxWMDJNRW5lMkQz
            WlV5Ky9sd1dRN0ZyQXQyQ0VuU1NEZmJMOEhrCjNiWWRMaVkrTGlhWlZWVThmVDVx
            M2Q0QmFFNWttWFI0M2ZxcTZlZ0U3LzgKLS0tIG1yWWZTbFZWbm1Ka1JWQjVnazBn
            dDNVOWRkejBiQm81Y1B0b2RlZUJsajQKKZfi1QzHZ8q5tdov5Wb7qVMvV134koTH
            UHGTp6k8S1dXYYnpcX1JOMnXv4lFllraoj4mYLB0XkJ1ch20BD6glA==
            -----END AGE ENCRYPTED FILE-----
    lastmodified: "2025-10-08T12:22:21Z"
    mac: ENC[AES256_GCM,data:uzJzy52EEYiF9hHi7H/F7Ib6F2YKLTguijf7RWlQRLKLFHCqLEVh6kr5PtTb7CRfEvy/0G59Si3n9uFOwilWzXOC4t0GbKeG7UEFokjkCveXTzd+sPUuDe/vmBEPWApcEvqJXJKJ/xbe1ogJKOdGRlrlAu6lZS5bTqFjR3jL1tA=,iv:qQ+TQ8bSoHxSX+thgA+iJOFBUX1H2iy2Sa+OzCjmQHM=,tag:ks1oAAh/zOuOlSI++H1gkg==,type:str]
    encrypted_regex: ^(data|stringData)$
    version: 3.10.2
```

## domains/auth/infra/overlays/cluster/auth-api-middleware.yaml
```
# # ------------------------------------------------------------
# # 1) Strip spoofable identity headers (MUST be first)
# # ------------------------------------------------------------
# apiVersion: traefik.io/v1alpha1
# kind: Middleware

# metadata:
#   name: platform-strip-identity-headers
# spec:
#   headers:
#     customRequestHeaders:
#       # Strip anything a client could try to spoof
#       X-User-Id: ""
#       X-Scope: ""
#       X-Aud: ""
#       X-Auth-Iss: ""
#       X-Auth-Exp: ""
#       # Optional: if you want services to never see JWT
#       Authorization: ""

# ---
# # ------------------------------------------------------------
# # 2) JWT validation + claim-to-header injection (runs AFTER strip)
# #
# # Notes:
# # - Required: true => requests without JWT get rejected (401/403 depending on plugin)
# # - Audiences/Issuers enforce coarse domain gating.
# # - JwtHeaders injects claims into headers *after validation*.
# # - PayloadFields must include any claims you want to extract.
# # ------------------------------------------------------------
# apiVersion: traefik.io/v1alpha1
# kind: Middleware

# metadata:
#   name: auth-jwt
# spec:
#   plugin:
#     jwt:
#       Required: true
#       Keys:
#         - http://auth-api-srv.auth.svc.cluster.local:3000/.well-known/jwks.json
#       Alg: ES256
#       ForceRefreshKeys: true

#       Issuers:
#         - https://tma.com
#       Audiences:
#         - ai

#       # Claims we want to extract
#       PayloadFields:
#         - sub
#         - aud
#         - iss
#         - exp
#         - scope

#       # Map claims â†’ headers visible to the service
#       JwtHeaders:
#         X-User-Id: sub
#         X-Aud: aud
#         X-Auth-Iss: iss
#         X-Auth-Exp: exp
#         X-Scope: scope

#       # Only accept Bearer token from Authorization header
#       JwtSources:
#         - type: bearer
#           key: Authorization

---
# ------------------------------------------------------------
# 3) Example IngressRoute using the chain:
#    strip spoofable headers â†’ validate JWT + inject headers â†’ rateLimit/inFlight
#
# Order matters:
#   - Strip FIRST
#   - JWT SECOND (so injected headers are trusted)
#   - Then your protection middlewares (rateLimit/inFlight/etc)
# ------------------------------------------------------------
apiVersion: traefik.io/v1alpha1
kind: Middleware

metadata:
  name: auth-ratelimit
spec:
  rateLimit:
    # safe_concurrency = ((max_conn - other connections) * budget) * safe_budget
    # average_per_minute â‰ˆ (safe_concurrency / p95) / assumed_IPs * 60
    # average_per_minute = 36 / 0.08 / 500 * 60
    # burst = average_per_minute * 2
    average: 50
    burst: 100
    period: 1m
    sourceCriterion:
      ipStrategy:
        depth: 1
---
apiVersion: traefik.io/v1alpha1
kind: Middleware

metadata:
  name: auth-inflight
spec:
  inFlightReq:
    # safe_concurrency = ((max_conn - other connections) * budget) * safe_budget
    # safe_concurrency = ((100 - 20) * 0.75) * 0.6 = 36 (cluster-wide)

    # With 1 Traefik replica, inFlight per pod = 36 / 1 = 36

    # Throughput estimate:
    # p95 = 80ms = 80 / 1000ms (1s) = 0.08
    # 36 / 0.08 = 450 rps
    # 450 * 60 * 60 * 24 * 30 â‰ˆ 1.16B requests/month
    amount: 36
---
apiVersion: traefik.io/v1alpha1
kind: Middleware

metadata:
  name: auth-body-limit
spec:
  buffering:
    maxRequestBodyBytes: 65536

# ------------------------------------------------------------
# 5) What your service should trust
#
# - X-User-Id (string UUID)
# - X-Scope   (string or list depending on how your auth issues it)
# - X-Aud     (ai/billing/auth)
#
# And it should IGNORE any incoming Authorization header
# because Traefik cleared it and you don't accept direct pod access anyway.
# ------------------------------------------------------------
```

## domains/auth/infra/overlays/cluster/auth-ksops-gen.yaml
```
apiVersion: viaduct.ai/v1
kind: KSOPS

metadata:
  name: auth-ksops-gen
  annotations:
    config.kubernetes.io/function: |
      exec:
        path: ksops
files:
  - auth-api-jwt.yaml
```

## domains/auth/infra/overlays/cluster/kustomization.yaml
```
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: auth

resources:
  - ../../base
  - auth-api-ingress.yaml
  - auth-api-jwt.yaml
  - auth-api-middleware.yaml

configMapGenerator:
  - name: auth-api-cm
    literals:
      - ORIGIN=https://tma.com

secretGenerator:
  - name: auth-db
    literals:
      - DATABASE_URL=postgres://postgres@postgres-srv:5432/auth?sslmode=disable

generators:
  - auth-ksops-gen.yaml

patches:
  - path: auth-api-depl.yaml

images:
  - name: mdstaicu/auth-api
    # This field is managed by this ImagePolicy: <namespace>:<imagepolicy-name>
    # meaning: flux-system:auth-api-latest
    newTag: latest # {"$imagepolicy": "flux-system:auth-api-latest"}
```

## domains/auth/infra/overlays/local/auth-api-depl.yaml
```
apiVersion: apps/v1
kind: Deployment

metadata:
  name: auth-api-depl
spec:
  replicas: 1
```

## domains/auth/infra/overlays/local/auth-api-jwt.yaml
```
apiVersion: v1
kind: Secret
metadata:
    name: auth-api-jwt
data:
    jwt-private.pem: ENC[AES256_GCM,data:nYJxeGsdvIenfpFCmzBmEovfadP2bqRkf17KBIAxP4Da7Um18L4jgTr+OYg+sxrTmxgCAicVVhRCrROG2yDKOjsq766EOLGKBnzOH2o5FPKlhxIT0U9ssuaxSCNA0Zo1EDLc6qZ2mmcy0U47Ps1AuVUtJ9dh6zkQFiBJBf87sCbgY85Rm9s4aUVDZlECbdrKsWCkBvYNXz8riy1r5wkVgntSkEPQ3+VzggNMHqrWLcpEfNfH6K9hwnHYPY9sYcPlHIltqGqieJ5So9dYLs4K1K39/VRE005lbrPMQD78FdfLcsQfIQzNRK2vmWKp0sHbxqNuEiG7F2RkZU3smFxKuIw8W8ywV5V6arhCT5T030LENag1lCfoXLid8u5l9Lw1cKvY5pbpWBW8CzyYH8FJYJAAtpjJasamf7c5K9vt9vqoJfGP,iv:sUT9S7Gk1LGpJim5OMOQcRSmX4xg+mHq87rqKLEqwAI=,tag:6KwVcNVxHu16RKbY8UxXaQ==,type:str]
    jwt-public.pem: ENC[AES256_GCM,data:37gsU2UeUt0WkK0o/WCuui1x/g0JfRYgi80Y9j3RQj5hWPvys8GBaLI6MBRTPyM+0nRJgE4hG6+x5MADkCwXOvj7TXIm/uwFQWpMzejsbmqjywCE8+dnasCZZ5z6oPCBMUPaYvb2F9UTekDKpU+eWYCqrWe/uBuH3gCf9ilH+dF9yCmzeDhC8PWO/xe8xTKbeCAS2pJ7TOj0owWoZb5MwimryzmhlpVfJlvCEDaPorqGvK3QHYBmxHWcb67JTksjJo1zofdIipNZMWrXO7RravVyE9q5Eiz2fXQFQ73cXuoWGtzwVT+giXTPH+OU/v3K,iv:xAsiiEehOWxzon2Uadz51A98Ods9EiFeTTpdnAFoZnc=,tag:SoDi6ZGUrs2N2j7YZZ9zIA==,type:str]
sops:
    age:
        - recipient: age1m0848yekwnxypu3te3n55845z9mmve8qvu0dqfgs34jgn87meaksdvkyu0
          enc: |
            -----BEGIN AGE ENCRYPTED FILE-----
            YWdlLWVuY3J5cHRpb24ub3JnL3YxCi0+IFgyNTUxOSB2M3lJYWxWMDJNRW5lMkQz
            WlV5Ky9sd1dRN0ZyQXQyQ0VuU1NEZmJMOEhrCjNiWWRMaVkrTGlhWlZWVThmVDVx
            M2Q0QmFFNWttWFI0M2ZxcTZlZ0U3LzgKLS0tIG1yWWZTbFZWbm1Ka1JWQjVnazBn
            dDNVOWRkejBiQm81Y1B0b2RlZUJsajQKKZfi1QzHZ8q5tdov5Wb7qVMvV134koTH
            UHGTp6k8S1dXYYnpcX1JOMnXv4lFllraoj4mYLB0XkJ1ch20BD6glA==
            -----END AGE ENCRYPTED FILE-----
    lastmodified: "2025-10-08T12:22:21Z"
    mac: ENC[AES256_GCM,data:uzJzy52EEYiF9hHi7H/F7Ib6F2YKLTguijf7RWlQRLKLFHCqLEVh6kr5PtTb7CRfEvy/0G59Si3n9uFOwilWzXOC4t0GbKeG7UEFokjkCveXTzd+sPUuDe/vmBEPWApcEvqJXJKJ/xbe1ogJKOdGRlrlAu6lZS5bTqFjR3jL1tA=,iv:qQ+TQ8bSoHxSX+thgA+iJOFBUX1H2iy2Sa+OzCjmQHM=,tag:ks1oAAh/zOuOlSI++H1gkg==,type:str]
    encrypted_regex: ^(data|stringData)$
    version: 3.10.2
```

## domains/auth/infra/overlays/local/auth-ksops-generator.yaml
```
apiVersion: viaduct.ai/v1
kind: KSOPS

metadata:
  name: auth-ksops-generator
  annotations:
    config.kubernetes.io/function: |
      exec:
        path: ksops
files:
  - auth-api-jwt.yaml
```

## domains/auth/infra/overlays/local/auth-migrate-job.yaml
```
apiVersion: batch/v1
kind: Job
metadata:
  name: auth-migrate

spec:
  backoffLimit: 4
  activeDeadlineSeconds: 300
  template:
    spec:
      restartPolicy: Never

      initContainers:
        - name: wait-postgres
          image: postgres:18
          command:
            - sh
            - -c
            - |
              echo "waiting for postgres..."
              until pg_isready -h postgres-srv -p 5432 -d auth; do
                sleep 2
              done
              echo "postgres ready"

      containers:
        - name: migrate
          image: mdstaicu/auth-migrate:latest

          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: auth-db
                  key: DATABASE_URL
```

## domains/auth/infra/overlays/local/auth-postgres-depl.yaml
```
apiVersion: apps/v1
kind: Deployment

metadata:
  name: auth-postgres-depl
spec:
  replicas: 1
  selector:
    matchLabels:
      app: auth-postgres
  template:
    metadata:
      labels:
        app: auth-postgres
    spec:
      containers:
        - name: auth-postgres
          image: docker.io/postgres:18
          env:
            - name: POSTGRES_HOST_AUTH_METHOD
              value: trust
            - name: POSTGRES_DB
              value: auth
---
apiVersion: v1
kind: Service

metadata:
  name: postgres-srv
spec:
  type: ClusterIP
  selector:
    app: auth-postgres
  ports:
    - name: postgres
      protocol: TCP
      port: 5432
      targetPort: 5432
```

## domains/auth/infra/overlays/local/kustomization.yaml
```
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: auth

resources:
  - ../../base
  - auth-migrate-job.yaml
  - auth-postgres-depl.yaml

configMapGenerator:
  - name: auth-api-cm
    literals:
      - ORIGIN=https://tma.com

secretGenerator:
  - name: auth-db
    literals:
      - DATABASE_URL=postgres://postgres@postgres-srv:5432/auth?sslmode=disable

generatorOptions:
  disableNameSuffixHash: true

patches:
  - path: auth-api-depl.yaml

generators:
  - auth-ksops-generator.yaml
```

## domains/auth/infra/overlays/preview/auth-api-depl.yaml
```
apiVersion: apps/v1
kind: Deployment

metadata:
  name: auth-api-depl
spec:
  selector:
    matchLabels:
      app: auth-api
  replicas: 1
  template:
    metadata:
      labels:
        app: auth-api
    spec:
      containers:
        - name: auth-api
          image: mdstaicu/auth-api
          env:
            - name: NATS_URL
              value: nats://auth-nats-srv:4222

            - name: OTEL_SERVICE_NAME
              value: auth-api

            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: ""

            - name: OTEL_METRICS_EXPORTER
              value: none

            - name: OTEL_LOGS_EXPORTER
              value: none
```

## domains/auth/infra/overlays/preview/auth-api-jwt.yaml
```
apiVersion: v1
kind: Secret
metadata:
  name: auth-api-jwt
data:
  jwt-private.pem: ENC[AES256_GCM,data:nYJxeGsdvIenfpFCmzBmEovfadP2bqRkf17KBIAxP4Da7Um18L4jgTr+OYg+sxrTmxgCAicVVhRCrROG2yDKOjsq766EOLGKBnzOH2o5FPKlhxIT0U9ssuaxSCNA0Zo1EDLc6qZ2mmcy0U47Ps1AuVUtJ9dh6zkQFiBJBf87sCbgY85Rm9s4aUVDZlECbdrKsWCkBvYNXz8riy1r5wkVgntSkEPQ3+VzggNMHqrWLcpEfNfH6K9hwnHYPY9sYcPlHIltqGqieJ5So9dYLs4K1K39/VRE005lbrPMQD78FdfLcsQfIQzNRK2vmWKp0sHbxqNuEiG7F2RkZU3smFxKuIw8W8ywV5V6arhCT5T030LENag1lCfoXLid8u5l9Lw1cKvY5pbpWBW8CzyYH8FJYJAAtpjJasamf7c5K9vt9vqoJfGP,iv:sUT9S7Gk1LGpJim5OMOQcRSmX4xg+mHq87rqKLEqwAI=,tag:6KwVcNVxHu16RKbY8UxXaQ==,type:str]
  jwt-public.pem: ENC[AES256_GCM,data:37gsU2UeUt0WkK0o/WCuui1x/g0JfRYgi80Y9j3RQj5hWPvys8GBaLI6MBRTPyM+0nRJgE4hG6+x5MADkCwXOvj7TXIm/uwFQWpMzejsbmqjywCE8+dnasCZZ5z6oPCBMUPaYvb2F9UTekDKpU+eWYCqrWe/uBuH3gCf9ilH+dF9yCmzeDhC8PWO/xe8xTKbeCAS2pJ7TOj0owWoZb5MwimryzmhlpVfJlvCEDaPorqGvK3QHYBmxHWcb67JTksjJo1zofdIipNZMWrXO7RravVyE9q5Eiz2fXQFQ73cXuoWGtzwVT+giXTPH+OU/v3K,iv:xAsiiEehOWxzon2Uadz51A98Ods9EiFeTTpdnAFoZnc=,tag:SoDi6ZGUrs2N2j7YZZ9zIA==,type:str]
sops:
  age:
    - recipient: age1m0848yekwnxypu3te3n55845z9mmve8qvu0dqfgs34jgn87meaksdvkyu0
      enc: |
        -----BEGIN AGE ENCRYPTED FILE-----
        YWdlLWVuY3J5cHRpb24ub3JnL3YxCi0+IFgyNTUxOSB2M3lJYWxWMDJNRW5lMkQz
        WlV5Ky9sd1dRN0ZyQXQyQ0VuU1NEZmJMOEhrCjNiWWRMaVkrTGlhWlZWVThmVDVx
        M2Q0QmFFNWttWFI0M2ZxcTZlZ0U3LzgKLS0tIG1yWWZTbFZWbm1Ka1JWQjVnazBn
        dDNVOWRkejBiQm81Y1B0b2RlZUJsajQKKZfi1QzHZ8q5tdov5Wb7qVMvV134koTH
        UHGTp6k8S1dXYYnpcX1JOMnXv4lFllraoj4mYLB0XkJ1ch20BD6glA==
        -----END AGE ENCRYPTED FILE-----
  lastmodified: "2025-10-08T12:22:21Z"
  mac: ENC[AES256_GCM,data:uzJzy52EEYiF9hHi7H/F7Ib6F2YKLTguijf7RWlQRLKLFHCqLEVh6kr5PtTb7CRfEvy/0G59Si3n9uFOwilWzXOC4t0GbKeG7UEFokjkCveXTzd+sPUuDe/vmBEPWApcEvqJXJKJ/xbe1ogJKOdGRlrlAu6lZS5bTqFjR3jL1tA=,iv:qQ+TQ8bSoHxSX+thgA+iJOFBUX1H2iy2Sa+OzCjmQHM=,tag:ks1oAAh/zOuOlSI++H1gkg==,type:str]
  encrypted_regex: ^(data|stringData)$
  version: 3.10.2
```

## domains/auth/infra/overlays/preview/auth-ksops-generator.yaml
```
apiVersion: viaduct.ai/v1
kind: KSOPS

metadata:
  name: auth-ksops-generator
  annotations:
    config.kubernetes.io/function: |
      exec:
        path: ksops
files:
  - auth-api-jwt.yaml
```

## domains/auth/infra/overlays/preview/auth-migrate-job.yaml
```
apiVersion: batch/v1
kind: Job
metadata:
  name: auth-migrate

spec:
  backoffLimit: 4
  activeDeadlineSeconds: 300
  template:
    ttlSecondsAfterFinished: 600

    spec:
      restartPolicy: Never

      initContainers:
        - name: wait-postgres
          image: postgres:18
          command:
            - sh
            - -c
            - |
              echo "waiting for postgres..."
              until pg_isready -h postgres-srv -p 5432 -d auth; do
                sleep 2
              done
              echo "postgres ready"

      containers:
        - name: migrate
          image: mdstaicu/auth-migrate:latest

          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: auth-db
                  key: DATABASE_URL
```

## domains/auth/infra/overlays/preview/auth-nats-depl.yaml
```
apiVersion: apps/v1
kind: Deployment

metadata:
  name: auth-nats-depl
spec:
  replicas: 1
  template:
    spec:
      containers:
        - image: nats:2.12-alpine
          args:
            - "-js"

---
kind: Service
metadata:
  name: auth-nats-srv
```

## domains/auth/infra/overlays/preview/auth-postgres-depl.yaml
```
apiVersion: apps/v1
kind: Deployment

metadata:
  name: auth-postgres-depl
spec:
  replicas: 1
  selector:
    matchLabels:
      app: auth-postgres
  template:
    metadata:
      labels:
        app: auth-postgres
    spec:
      containers:
        - name: auth-postgres
          image: docker.io/postgres:18
          env:
            - name: POSTGRES_HOST_AUTH_METHOD
              value: trust
            - name: POSTGRES_DB
              value: auth
---
apiVersion: v1
kind: Service

metadata:
  name: postgres-srv
spec:
  type: ClusterIP
  selector:
    app: auth-postgres
  ports:
    - name: postgres
      protocol: TCP
      port: 5432
      targetPort: 5432
```

## domains/auth/infra/overlays/preview/kustomization.yaml
```
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: auth-preview

resources:
  - ../../base
  - auth-migrate-job.yaml
  - auth-postgres-depl.yaml
  - auth-nats-depl.yaml

configMapGenerator:
  - name: auth-api-cm
    literals:
      - ORIGIN=https://tma.com

secretGenerator:
  - name: auth-db
    literals:
      - DATABASE_URL=postgres://postgres@postgres-srv:5432/auth?sslmode=disable

generatorOptions:
  disableNameSuffixHash: true

patches:
  - path: auth-api-depl.yaml

generators:
  - auth-ksops-generator.yaml
```

## domains/auth/migrations/.dockerignore
```
Dockerfile
README.md```

## domains/auth/migrations/1770740146106_init.up.sql
```
-- Up Migration

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY
);

CREATE TABLE credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    credential_id BYTEA NOT NULL UNIQUE,

    user_id UUID NOT NULL
        REFERENCES users(id) 
        ON DELETE CASCADE,

    public_key BYTEA NOT NULL,

    sign_count BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID,

    challenge BYTEA NOT NULL UNIQUE,

    expires_at TIMESTAMPTZ NOT NULL 
        DEFAULT NOW() + INTERVAL '2 minutes'
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    refresh_token_hash BYTEA NOT NULL UNIQUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    expires_at TIMESTAMPTZ NOT NULL,

    revoked_at TIMESTAMPTZ
);

-- Authority topology snapshot

-- CREATE TABLE access_projection (
--     user_id UUID NOT NULL
--         REFERENCES users(id)
--         ON DELETE CASCADE,
--     tenant_id UUID NULL,
--     roles TEXT[] NOT NULL DEFAULT '{}',

--     PRIMARY KEY (user_id, tenant_id)
-- );```

## domains/auth/migrations/Dockerfile
```
FROM migrate/migrate:v4.19.1

COPY . /migrations

ENTRYPOINT ["sh", "-c"]
CMD ["migrate -path=/migrations -database=$DATABASE_URL up"]```

## domains/auth/migrations/README.md
```
docker build -t mdstaicu/auth-migrate domains/auth/migrations
docker push mdstaicu/auth-migrate
docker run -it --rm --entrypoint sh mdstaicu/auth-migrate```

## domains/auth/skaffold.yaml
```
apiVersion: skaffold/v4beta11
kind: Config

metadata:
  name: auth

build:
  local:
    push: false

  artifacts:
    - image: mdstaicu/auth-api
      context: auth-api
      docker:
        dockerfile: Dockerfile
        target: dev

      sync:
        manual:
          - src: src/**/*
            dest: .

profiles:
  - name: local

    manifests:
      kustomize:
        paths:
          - infra/overlays/local
        buildArgs:
          - --enable-alpha-plugins
          - --enable-exec

    deploy:
      kubectl: {}

  - name: preview

    manifests:
      kustomize:
        paths:
          - infra/overlays/preview
        buildArgs:
          - --enable-alpha-plugins
          - --enable-exec

    deploy:
      kubectl: {}

    portForward:
      - resourceType: service
        resourceName: auth-api-srv
        namespace: auth
        port: 3000
        localPort: 4300
```

## domains/skaffold.yaml
```
apiVersion: skaffold/v4beta11
kind: Config

metadata:
  name: domains

requires:
  - path: auth
```

