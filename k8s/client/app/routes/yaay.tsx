import { json, useLoaderData } from "remix";
import type { LoaderFunction } from "remix";

import { stripe } from "~/utils/stripe.server";

export let loader: LoaderFunction = async ({ request }) => {
  let url = new URL(request.url);
  let sessionId = url.searchParams.get("session_id");

  if (!sessionId) {
    throw json("You must provide a 'session_id' param", {
      status: 400,
    });
  }

  let session = await stripe.checkout.sessions.retrieve(sessionId);

  if (!session) {
    throw json("You must provide a valid 'session_id' param", {
      status: 400,
    });
  }

  let customer = await stripe.customers.retrieve(session.customer as string);

  return json({ customerId: customer.id });
};

export default () => {
  let data = useLoaderData();

  return (
    <div>
      <p>Welcome: {data.customerId}.</p>
    </div>
  );
};
