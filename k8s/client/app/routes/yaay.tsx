import Stripe from "stripe";
import { useLoaderData, useCatch } from "@remix-run/react";
import { json } from "@remix-run/node";

import type { ThrownResponse } from "@remix-run/react";
import type { LoaderFunction } from "@remix-run/node";

import { stripe } from "~/utils/stripe.server";

type LoaderData = {
  customer: Stripe.Customer;
};

export let loader: LoaderFunction = async ({ request }) => {
  let url = new URL(request.url);
  let sessionId = url.searchParams.get("session_id");

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

  return (
    <main>
      <h2>Welcome: {customer.email}.</h2>
    </main>
  );
};

export function CatchBoundary() {
  const caught = useCatch<ThrownResponse<400, { message: string }>>();

  return (
    <main>
      <h2>Uh oh, something went wrong. {caught.data.message}</h2>
      {/* <Link to=".">Try again?</Link> */}
    </main>
  );
}
