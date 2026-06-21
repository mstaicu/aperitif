import { Type } from "@sinclair/typebox";

const EntitlementId = Type.String({
  description: "Stable entitlement identifier.",
  minLength: 1,
});

export const Entitlement = Type.Object(
  {
    id: EntitlementId,
    merge_strategy: Type.Union(
      [
        Type.Literal("boolean_or"),
        Type.Literal("number_max"),
        Type.Literal("number_sum"),
      ],
      {
        description: "Rule used to merge multiple grants for this entitlement.",
      },
    ),
    name: Type.String({
      description: "Human-readable entitlement name.",
      minLength: 1,
    }),
    value_type: Type.Union([Type.Literal("boolean"), Type.Literal("number")], {
      description: "Expected value type for grants of this entitlement.",
    }),
  },
  {
    additionalProperties: false,
    description: "Entitlement understood by this domain.",
  },
);

export const EntitlementsResponse = Type.Object(
  {
    entitlements: Type.Array(Entitlement),
  },
  {
    additionalProperties: false,
    description: "Entitlements visible to the authenticated caller.",
  },
);
