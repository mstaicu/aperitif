import Stripe from "stripe";
import { useLoaderData, useCatch } from "@remix-run/react";
import { json } from "@remix-run/node";

import type { ThrownResponse } from "@remix-run/react";
import type { LoaderFunction } from "@remix-run/node";
import type { ProblemDetailsResponse } from "@tartine/common";

import { getStripeSessionCustomer } from "~/utils/onboarding.server";

/**
 *
 */
type LoaderData = {
  customer: Stripe.Customer;
};

export let loader: LoaderFunction = async ({ request }) => {
  let { searchParams } = new URL(request.url);

  return json({
    customer: await getStripeSessionCustomer(searchParams.get("session_id")),
  });
};

/**
 *
 */
export default () => {
  let { customer } = useLoaderData<LoaderData>();

  return (
    <main>
      <h2>Welcome: {customer.email}</h2>
    </main>
  );
};

export function CatchBoundary() {
  const {
    data: { detail },
  } = useCatch<ThrownResponse<400, Partial<ProblemDetailsResponse>>>();

  return (
    <main>
      <h2>Uh oh, something went wrong. {detail}</h2>
    </main>
  );
}
