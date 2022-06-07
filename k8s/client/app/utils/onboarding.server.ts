import Stripe from "stripe";
import { json } from "@remix-run/node";

import { stripe } from "~/utils/stripe.server";

import type { ProblemDetailsResponse } from "@tartine/common";

/**
 *
 */

export type ServiceLevel = { product: Stripe.Product; prices: Stripe.Price[] };

/**
 *
 */

type GetStripeCheckoutUrlParams = {
  priceId: string;
  email: string;
};

export async function getStripeCheckoutUrl({
  priceId,
  email,
}: GetStripeCheckoutUrlParams) {
  if (!priceId) {
    throw json<Partial<ProblemDetailsResponse>>(
      {
        detail: "You must provide a price identifier with this request",
      },
      {
        status: 400,
      }
    );
  }

  if (!email) {
    throw json<Partial<ProblemDetailsResponse>>(
      {
        detail: "You must provide a valid email address with this request",
      },
      {
        status: 400,
      }
    );
  }

  let { data: customers } = await stripe.customers.list({
    email: email.toLocaleLowerCase(),
  });

  if (customers.length > 0) {
    throw json<Partial<ProblemDetailsResponse>>(
      {
        detail: "Email address is already registered with us",
      },
      {
        status: 400,
      }
    );
  }

  let price = await stripe.prices.retrieve(priceId);

  if (!price) {
    throw json<Partial<ProblemDetailsResponse>>(
      {
        detail:
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

    customer_email: email,

    success_url: `https://${process.env.DOMAIN}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `https://${process.env.DOMAIN}/checkout/cancelled`,
  });

  if (!url) {
    throw json<Partial<ProblemDetailsResponse>>(
      {
        detail: "Something went wrong while trying to initiate the checkout",
      },
      {
        status: 400,
      }
    );
  }

  return url;
}

export async function getServiceLevelOfferings() {
  /**
   * Pricing models are patterns that represent your business on Stripe.
   * The building blocks for these patterns are Product and Price objects.
   * With these objects, you can create pricing structures that reflect your recurring revenue model.
   */

  /**
   * Many SaaS businesses offer their customers a choice of escalating service options,
   * a model called good-better-best.
   *
   * Imagine a business called Togethere that sells a collaboration platform.
   * They offer three different service levels: basic, starter, and enterprise.
   *
   * For each service level, they offer a monthly and yearly price.
   * Togethere operates in several countries, so they have prices in multiple currencies.
   * The product descriptions are shared between prices and appear the same on the customer’s receipt and invoice-only the pricing differs.
   *
   * https://stripe.com/docs/products-prices/pricing-models
   */

  let { data: products } = await stripe.products.list({ active: true });

  /**
   * Flat rate – Good-better-best pricing model
   */

  /**
   * Define service levels
   */
  let levels: ServiceLevel[] = await Promise.all(
    products.map(async (product) => {
      let { data: prices } = await stripe.prices.list({
        product: product.id,
        active: true,
      });

      /**
       * Currently offering a single service levels: basic
       */

      return {
        product,

        /**
         * For each service level, offer a monthly, and maybe a yearly price
         */
        prices,
      };
    })
  );

  return json({ levels });
}

type GetStripeSessionCustomerParams = {
  sessionId: string | null;
};

export async function getStripeSessionCustomer({
  sessionId,
}: GetStripeSessionCustomerParams) {
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

  return await stripe.customers.retrieve(`${session.customer}`);
}
