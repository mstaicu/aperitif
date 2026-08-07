import { Type } from "@fastify/type-provider-typebox";

const Features = Type.Record(
  Type.String({ minLength: 1 }),
  Type.Union([Type.Boolean(), Type.Number(), Type.String()]),
);

export const OverrideParams = Type.Object(
  {
    account_id: Type.String({
      description: "Stable account identifier.",
      format: "uuid",
    }),
    feature_id: Type.String({
      description: "Stable feature identifier.",
      minLength: 1,
    }),
  },
  { additionalProperties: false },
);

export const OverrideBody = Type.Object(
  {
    value: Type.Union([Type.Boolean(), Type.Number(), Type.String()]),
  },
  { additionalProperties: false },
);

export const FeaturesResponse = Type.Object(
  {
    features: Features,
  },
  { additionalProperties: false },
);
