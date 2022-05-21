import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import type { LoaderFunction } from "@remix-run/node";

import { stripe } from "~/utils/stripe.server";

type Plan = {
  id: string;
  name: string;
  price: number | null;
};

type LoaderData = {
  plans: Plan[];
};

export let loader: LoaderFunction = async () => {
  let { data: prices } = await stripe.prices.list();

  prices = prices.filter(({ active }) => active);

  let plans: Plan[] = await Promise.all(
    prices.map(async (price) => {
      let product = await stripe.products.retrieve(`${price.product}`);

      return {
        id: price.id,
        name: product.name,
        price: price.unit_amount,
      };
    })
  );

  return json({ plans });
};

export default () => {
  let { plans } = useLoaderData<LoaderData>();

  return (
    <div>
      <h1>Welcome to the future</h1>
      <ul>
        {plans.map((plan) => (
          <li key={plan.id}>
            <a href={`/checkout/${plan.id}`}>{plan.name}</a>
          </li>
        ))}
      </ul>
    </div>
  );
};
