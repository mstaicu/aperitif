import { Type } from "@sinclair/typebox";

const CapabilityId = Type.String({
  description: "Stable capability identifier.",
  minLength: 1,
});

export const Capability = Type.Object(
  {
    id: CapabilityId,
    merge_strategy: Type.Union(
      [
        Type.Literal("boolean_or"),
        Type.Literal("number_max"),
        Type.Literal("number_sum"),
      ],
      {
        description: "Rule used to merge multiple grants for this capability.",
      },
    ),
    name: Type.String({
      description: "Human-readable capability name.",
      minLength: 1,
    }),
    value_type: Type.Union([Type.Literal("boolean"), Type.Literal("number")], {
      description: "Expected value type for grants of this capability.",
    }),
  },
  {
    additionalProperties: false,
    description: "Capability understood by this domain.",
  },
);

export const CapabilitiesResponse = Type.Object(
  {
    capabilities: Type.Array(Capability),
  },
  {
    additionalProperties: false,
    description: "Capabilities visible to the authenticated caller.",
  },
);
