import type {
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  FastifyInstance,
} from "fastify";
import type { Pool } from "pg";
import type { NatsConnection } from "@nats-io/transport-node";
import type { JetStreamClient, JetStreamManager } from "@nats-io/jetstream";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";

declare module "fastify" {
  interface FastifyInstance {
    pool: Pool;
    nc: NatsConnection;
    js: JetStreamClient;
    jsm: JetStreamManager;
  }
}

export type Instance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;
