import { Type } from "@sinclair/typebox";

const FeatureValue = Type.Unknown({
  description: "Boolean or number value this product grants for the feature.",
});

const FeatureType = Type.Union(
  [Type.Literal("boolean"), Type.Literal("number")],
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
  },
  {
    additionalProperties: false,
    description: "Product catalogue item with included features.",
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
