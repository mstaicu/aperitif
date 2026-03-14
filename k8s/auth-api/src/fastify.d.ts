import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { JetStreamClient } from "@nats-io/jetstream";
import type {
  FastifyBaseLogger,
  FastifyInstance,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from "fastify";
import type { Pool } from "pg";

declare module "fastify" {
  interface FastifyInstance {
    pool: Pool;
    // nc: NatsConnection;
    js: JetStreamClient;
  }
}

export type Instance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;
