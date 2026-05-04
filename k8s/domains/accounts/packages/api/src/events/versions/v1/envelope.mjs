import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { UuidSchema } from "./resources.mjs";

export const ACCOUNTS_EVENT_PRODUCER = "accounts";
export const ACCOUNTS_EVENT_SCHEMA_VERSION = 1;

export const AccountsEventEnvelopeSchema = Type.Object(
  {
    id: UuidSchema,
    occurred_at: Type.String({ minLength: 1 }),
    payload: Type.Object({}, { additionalProperties: true }),
    producer: Type.Literal(ACCOUNTS_EVENT_PRODUCER),
    schema_version: Type.Integer({ minimum: 1 }),
    subject: Type.String({ minLength: 1 }),
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountsEventEnvelopeSchema
 * >} AccountsEventEnvelope
 */

export const AccountsEventEnvelopeCheck = TypeCompiler.Compile(
  AccountsEventEnvelopeSchema,
);
