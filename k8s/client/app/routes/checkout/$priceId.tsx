import { json, redirect } from "remix";
import type { LoaderFunction } from "remix";

import { stripe } from "~/utils/stripe.server";

export let loader: LoaderFunction = async ({ params }) => {
  const { priceId } = params;

  if (!priceId) {
    throw json(
      "You must provide a 'priceId' for the subscription you are looking to purchase",
      {
        status: 400,
      }
    );
  }

  const price = await stripe.prices.retrieve(priceId);

  if (!price) {
    throw json(
      "The provide 'priceId' does not belong to any plans that we offer",
      {
        status: 400,
      }
    );
  }

  const { url } = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],

    success_url: `https://${process.env.DOMAIN}/yaay?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `https://${process.env.DOMAIN}/naay`,
  });

  if (!url) {
    throw json("Something went wrong while trying to initiate the checkout", {
      status: 400,
    });
  }

  return redirect(url);
};
