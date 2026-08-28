import { Type } from "@fastify/type-provider-typebox";

const AccountId = Type.String({
  description: "Stable account identifier.",
  format: "uuid",
});

const PlanId = Type.String({
  description: "Stable plan identifier.",
  minLength: 1,
});

const Features = Type.Record(
  Type.String({ minLength: 1 }),
  Type.Union([Type.Boolean(), Type.Number(), Type.String()]),
);

export const PlanParams = Type.Object(
  {
    account_id: AccountId,
  },
  { additionalProperties: false },
);

export const PlanBody = Type.Object(
  {
    plan_id: PlanId,
  },
  { additionalProperties: false },
);

export const Plan = Type.Object(
  {
    features: Features,
    id: PlanId,
  },
  { additionalProperties: false },
);

export const PlanResponse = Type.Object(
  {
    plan: Plan,
  },
  { additionalProperties: false },
);
