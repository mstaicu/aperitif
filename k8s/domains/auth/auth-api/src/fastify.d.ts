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
