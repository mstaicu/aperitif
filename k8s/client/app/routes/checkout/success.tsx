import Stripe from "stripe";
import { useLoaderData, useCatch } from "@remix-run/react";
import { json } from "@remix-run/node";

import type { ThrownResponse } from "@remix-run/react";
import type { LoaderFunction } from "@remix-run/node";

import { getStripeSessionCustomer } from "~/utils/onboarding.server";

type LoaderData = {
  customer: Stripe.Customer;
};

export let loader: LoaderFunction = async ({ request }) => {
  let { searchParams } = new URL(request.url);
  let sessionId = searchParams.get("session_id");

  return json({
    customer: await getStripeSessionCustomer({ sessionId }),
  });
};

export default () => {
  let { customer } = useLoaderData<LoaderData>();

  return (
    <main>
      <h2>Welcome: {customer.email}.</h2>
    </main>
  );
};

/**
 *
 */

type CatchBoundaryData = { message: string };

export function CatchBoundary() {
  const {
    data: { message },
  } = useCatch<ThrownResponse<400, CatchBoundaryData>>();

  return (
    <main>
      <h2>Uh oh, something went wrong. {message}</h2>
    </main>
  );
}
