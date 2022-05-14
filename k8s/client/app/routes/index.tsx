import { json, useLoaderData } from "remix";
import type { LoaderFunction } from "remix";

import { stripe } from "~/utils/stripe.server";
// import { getAuthSession } from "~/utils/auth.server";

export let loader: LoaderFunction = async ({ request }) => {
  // let [userData, jwt] = await getAuthSession(request);

  let { data: prices } = await stripe.prices.list();

  let plans = await Promise.all(
    prices.map(async (price) => {
      let product = await stripe.products.retrieve(price.product as string);

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
  let data = useLoaderData();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
      <h1>Welcome to Remix</h1>
      <ul>
        <li>
          <a
            target="_blank"
            href="https://remix.run/tutorials/blog"
            rel="noreferrer"
          >
            15m Quickstart Blog Tutorial
          </a>
        </li>
        <li>
          <a
            target="_blank"
            href="https://remix.run/tutorials/jokes"
            rel="noreferrer"
          >
            Deep Dive Jokes App Tutorial
          </a>
        </li>
        <li>
          <a target="_blank" href="https://remix.run/docs" rel="noreferrer">
            Remix Docs
          </a>
        </li>
        {data.plans.map((plan: any) => (
          <li key={plan.id}>
            <a href={`/checkout/${plan.id}`}>{plan.name}</a>
          </li>
        ))}
      </ul>
    </div>
  );
};
