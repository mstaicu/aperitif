import Stripe from "stripe";
import { useLoaderData, useCatch } from "@remix-run/react";
import { json } from "@remix-run/node";

import type { ThrownResponse } from "@remix-run/react";
import type { LoaderFunction } from "@remix-run/node";

import { stripe } from "~/utils/stripe.server";

/**
 *
 */

type LoaderData = {
  customer: Stripe.Customer;
};

type CatchBoundaryData = { message: string };

/**
 *
 */

export let loader: LoaderFunction = async ({ request }) => {
  let { searchParams } = new URL(request.url);
  let sessionId = searchParams.get("session_id");

  if (!sessionId) {
    throw json(
      { message: "Uh oh, you must provide a session identifier" },
      {
        status: 400,
      }
    );
  }

  let session = await stripe.checkout.sessions.retrieve(sessionId);

  if (!session) {
    throw json(
      {
        message:
          "Uh oh, could not retrieve the session for the given session identifier",
      },
      {
        status: 400,
      }
    );
  }

  return json({
    customer: await stripe.customers.retrieve(`${session.customer}`),
  });
};

export default () => {
  let { customer } = useLoaderData<LoaderData>();

  /**
   * TODO: Continue onboarding the user?
   */

  return (
    <main>
      <h2>Welcome: {customer.email}.</h2>
    </main>
  );
};

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
