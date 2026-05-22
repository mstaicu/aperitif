import { Type } from "@sinclair/typebox";

const FeatureId = Type.String({
  description: "Stable feature identifier.",
  minLength: 1,
});

export const Feature = Type.Object(
  {
    id: FeatureId,
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
    value_type: Type.Union([Type.Literal("boolean"), Type.Literal("number")], {
      description: "Expected value type for grants of this feature.",
    }),
  },
  {
    additionalProperties: false,
    description: "Feature understood by this domain.",
  },
);

export const FeaturesResponse = Type.Object(
  {
    features: Type.Array(Feature),
  },
  {
    additionalProperties: false,
    description: "Features visible to the authenticated caller.",
  },
);
