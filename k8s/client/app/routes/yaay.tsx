import Stripe from "stripe";
import { json, useLoaderData } from "remix";
import type { LoaderFunction } from "remix";

import { stripe } from "~/utils/stripe.server";

type LoaderData = {
  customer: Stripe.Customer;
};

export let loader: LoaderFunction = async ({ request }) => {
  let url = new URL(request.url);
  let sessionId = url.searchParams.get("session_id");

  if (!sessionId) {
    throw json("You must provide a 'session_id' query string param", {
      status: 400,
    });
  }

  let session = await stripe.checkout.sessions.retrieve(sessionId);

  if (!session) {
    throw json("You must provide a valid 'session_id' query string param", {
      status: 400,
    });
  }

  return json({
    customer: await stripe.customers.retrieve(`${session.customer}`),
  });
};

export default () => {
  let { customer } = useLoaderData<LoaderData>();

  return (
    <div>
      <p>Welcome: {customer.email}.</p>
    </div>
  );
};
