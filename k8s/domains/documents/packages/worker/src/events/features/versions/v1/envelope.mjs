import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { UuidSchema } from "./resources.mjs";

export const FEATURES_EVENT_SCHEMA_VERSION = 1;

export const FeaturesEventEnvelopeSchema = Type.Object(
  {
    id: UuidSchema,
    payload: Type.Object({}, { additionalProperties: true }),
    schema_version: Type.Integer({ minimum: 1 }),
    subject: Type.String({ minLength: 1 }),
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof FeaturesEventEnvelopeSchema
 * >} FeaturesEventEnvelope
 */

export const FeaturesEventEnvelopeCheck = TypeCompiler.Compile(
  FeaturesEventEnvelopeSchema,
);
