import { Type } from "@sinclair/typebox";

const FeatureValue = Type.Unknown({
  description:
    "JSON value this product grants for the feature. It must match the feature value type.",
});

const FeatureValueType = Type.Union(
  [
    Type.Literal("boolean"),
    Type.Literal("number"),
    Type.Literal("string"),
    Type.Literal("json"),
  ],
  {
    description: "Expected JSON value type for grants of this feature.",
  },
);

const ProductType = Type.Union(
  [Type.Literal("plan"), Type.Literal("addon"), Type.Literal("top_up")],
  {
    description:
      "Commercial/access shape of the product. Plans are the initial SaaS pricing packages.",
  },
);

const BillingType = Type.Union(
  [Type.Literal("recurring"), Type.Literal("one_time")],
  {
    description: "Whether this price is recurring or one-time.",
  },
);

const BillingPeriod = Type.Union([
  Type.Object(
    {
      count: Type.Integer({ minimum: 1 }),
      unit: Type.Union([
        Type.Literal("day"),
        Type.Literal("week"),
        Type.Literal("month"),
        Type.Literal("year"),
      ]),
    },
    {
      additionalProperties: false,
      description: "Recurring billing period for this price.",
    },
  ),
  Type.Null(),
]);

export const ProductFeature = Type.Object(
  {
    key: Type.String({
      description: "Stable internal feature key.",
      minLength: 1,
    }),
    name: Type.String({
      description: "Human-readable feature name.",
      minLength: 1,
    }),
    value: FeatureValue,
    value_type: FeatureValueType,
  },
  {
    additionalProperties: false,
    description: "Feature value granted by a product catalogue template.",
  },
);

export const ProductPrice = Type.Object(
  {
    amount_minor: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
    billing_period: BillingPeriod,
    billing_type: BillingType,
    code: Type.String({
      description: "Stable local price code.",
      minLength: 1,
    }),
    currency_code: Type.Union([Type.String({ minLength: 3 }), Type.Null()]),
    provider: Type.String({
      description: "Payment/acquisition provider key.",
      minLength: 1,
    }),
  },
  {
    additionalProperties: false,
    description: "Active way to sell or acquire a local product.",
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
    prices: Type.Array(ProductPrice),
    type: ProductType,
  },
  {
    additionalProperties: false,
    description: "Product catalogue item with included features and prices.",
  },
);

export const ProductsResponse = Type.Object(
  {
    products: Type.Array(Product),
  },
  {
    additionalProperties: false,
    description: "Active products visible to the authenticated caller.",
  },
);
