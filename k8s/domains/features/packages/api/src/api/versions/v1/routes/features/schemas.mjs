import { Type } from "@sinclair/typebox";

const FeatureCode = Type.String({
  description: "Stable feature code.",
  minLength: 1,
});

export const FeatureDefinition = Type.Object(
  {
    code: FeatureCode,
    merge_strategy: Type.Union(
      [
        Type.Literal("boolean_or"),
        Type.Literal("number_max"),
        Type.Literal("number_sum"),
      ],
      {
        description: "Rule used to merge multiple grants for this feature.",
      },
    ),
    name: Type.String({
      description: "Human-readable feature name.",
      minLength: 1,
    }),
    type: Type.Union([Type.Literal("boolean"), Type.Literal("number")], {
      description: "Expected value type for grants of this feature.",
    }),
  },
  {
    additionalProperties: false,
    description: "Feature definition understood by this domain.",
  },
);

export const FeaturesResponse = Type.Object(
  {
    features: Type.Array(FeatureDefinition),
  },
  {
    additionalProperties: false,
    description: "Feature definitions visible to the authenticated caller.",
  },
);
