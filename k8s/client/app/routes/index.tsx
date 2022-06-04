import Stripe from "stripe";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import type { LoaderFunction, LinksFunction } from "@remix-run/node";

import { stripe } from "~/utils/stripe.server";

/**
 *
 */

import styles from "~/styles/index.css";

export let links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

/**
 *
 */
type ServiceLevel = {
  product: Stripe.Product & { prices: Stripe.Price[] };
};

type LoaderData = {
  levels: ServiceLevel[];
};
/**
 *
 */

export let loader: LoaderFunction = async () => {
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
   * Service levels
   */
  let levels = await Promise.all(
    products.map(async (product) => {
      let { data: prices } = await stripe.prices.list({
        product: product.id,
        active: true,
      });

      /**
       * Currently offering a single service levels: basic
       */

      return {
        product: {
          ...product,

          /**
           * For each service level, offer a monthly and yearly price
           */
          prices,
        },
      };
    })
  );

  return json({ levels });
};

export default () => {
  let { levels } = useLoaderData<LoaderData>();

  return (
    <main>
      <section className="wrapper">
        <div className="container">
          <div className="img__container">
            <img
              src="https://images.unsplash.com/photo-1546793665-c74683f339c1?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=634&q=80"
              alt="salad"
              className="img"
            />
          </div>
          <div className="content">
            <h2 className="subtitle">Subscribe today</h2>
            <h1 className="title">Never miss a recipe</h1>
            <input
              type="text"
              className="mail"
              placeholder="Your email address"
              name="mail"
              required
            />
            <input type="submit" value="Subscribe" className="subscribe" />
            <p className="text">
              We won't send you spam. Unsubscribe at any time.
            </p>
          </div>
        </div>
      </section>

      {levels.map((level) => (
        <div key={level.product.id}>
          <h2>{level.product.name}</h2>

          {level.product.prices.map((price) => (
            <div key={price.id}>
              <p>
                {price.unit_amount} for {price.recurring?.interval}
              </p>
            </div>
          ))}
        </div>
      ))}
    </main>
  );
};
