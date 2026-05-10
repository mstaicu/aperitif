import { Type } from "@sinclair/typebox";

const FeatureValue = Type.Unknown({
  description:
    "Value this product grants for the feature. It must match the feature type.",
});

const FeatureType = Type.Union(
  [Type.Literal("boolean"), Type.Literal("number"), Type.Literal("string")],
  {
    description: "Expected value type for grants of this feature.",
  },
);

export const ProductFeature = Type.Object(
  {
    code: Type.String({
      description: "Stable internal feature code.",
      minLength: 1,
    }),
    name: Type.String({
      description: "Human-readable feature name.",
      minLength: 1,
    }),
    type: FeatureType,
    value: FeatureValue,
  },
  {
    additionalProperties: false,
    description: "Feature value granted by a product catalogue template.",
  },
);

export const ProductOffer = Type.Object(
  {
    amount_minor: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
    code: Type.String({
      description: "Stable local offer code.",
      minLength: 1,
    }),
  },
  {
    additionalProperties: false,
    description: "Simple catalogue offer for a local product.",
  },
);

export const Product = Type.Object(
  {
    code: Type.String({
      description: "Stable local product code.",
      minLength: 1,
    }),
    features: Type.Array(ProductFeature),
    name: Type.String({
      description: "Human-readable product name.",
      minLength: 1,
    }),
    offers: Type.Array(ProductOffer),
  },
  {
    additionalProperties: false,
    description: "Product catalogue item with included features and offers.",
  },
);

export const ProductsResponse = Type.Object(
  {
    products: Type.Array(Product),
  },
  {
    additionalProperties: false,
    description: "Products visible to the authenticated caller.",
  },
);
