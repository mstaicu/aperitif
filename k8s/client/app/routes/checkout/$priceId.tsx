import { json, redirect } from "@remix-run/node";

import type { ActionFunction } from "@remix-run/node";

import { stripe } from "~/utils/stripe.server";

export let action: ActionFunction = async ({ request, params }) => {
  let { priceId } = params;
  let { email } = Object.fromEntries(new URLSearchParams(await request.text()));

  if (!priceId) {
    throw json(
      {
        message: "You must provide a 'priceId' with this request",
      },
      {
        status: 400,
      }
    );
  }

  if (!email) {
    throw json(
      {
        message: "You must provide an 'email' address with this request",
      },
      {
        status: 400,
      }
    );
  }

  let price = await stripe.prices.retrieve(priceId);

  if (!price) {
    throw json(
      {
        message:
          "The provided 'priceId' does not belong to any plans that we offer",
      },
      {
        status: 400,
      }
    );
  }

  let { url } = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],

    success_url: `https://${process.env.DOMAIN}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `https://${process.env.DOMAIN}/checkout/cancelled`,
  });

  if (!url) {
    throw json(
      {
        message: "Something went wrong while trying to initiate the checkout",
      },
      {
        status: 400,
      }
    );
  }

  return redirect(url);
};
