import {
  Form,
  useActionData,
  useLoaderData,
  useTransition,
} from "@remix-run/react";
import { redirect } from "@remix-run/node";

import type {
  ActionFunction,
  LoaderFunction,
  LinksFunction,
} from "@remix-run/node";
import type { ProblemDetailsResponse } from "@tartine/common";

import styles from "~/styles/index.css";

export let links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

/**
 *
 */

import {
  getServiceLevelOfferings,
  getStripeCheckoutUrl,
} from "~/utils/onboarding.server";
import type { ServiceLevel } from "~/utils/onboarding.server";

/**
 *
 */
type LoaderData = { levels: ServiceLevel[] };

export let loader: LoaderFunction = () => getServiceLevelOfferings();

/**
 *
 */
type ActionData = Partial<ProblemDetailsResponse>;

export let action: ActionFunction = async ({ request }) => {
  let { email, priceId } = Object.fromEntries(
    new URLSearchParams(await request.text())
  );

  try {
    redirect(await getStripeCheckoutUrl({ priceId, email }));
  } catch (error) {
    return error;
  }
};

/**
 *
 */

export default () => {
  let transition = useTransition();

  let loaderData = useLoaderData<LoaderData>();
  let actionData = useActionData<ActionData>();

  let state: "submitting" | "error" | "idle" = transition.submission
    ? "submitting"
    : actionData?.status !== 200
    ? "error"
    : "idle";

  return (
    <main>
      <div className="container">
        {loaderData?.levels.map((serviceLevel) => (
          <div key={serviceLevel.product.id} className="card">
            <h1 className="title">{serviceLevel.product.name}</h1>

            <div className="prices">
              {serviceLevel.prices.map((price) => (
                <div key={price.id} className="price">
                  <h3 className="title">
                    {new Intl.NumberFormat("en-UK", {
                      style: "currency",
                      currency: price.currency.toUpperCase(),
                    }).format(price.unit_amount! / 100)}{" "}
                    per {price.recurring?.interval}
                  </h3>

                  <Form replace={true} method="post">
                    <fieldset disabled={state === "submitting"}>
                      <input
                        aria-label="Email address"
                        aria-describedby="error-message"
                        type="email"
                        name="email"
                        placeholder="Your email address"
                        className="mail"
                      />

                      <input
                        name="priceId"
                        type="text"
                        defaultValue={price.id}
                        hidden
                      />

                      <p id="error-message">
                        {state === "error" ? actionData?.detail : <>&nbsp;</>}
                      </p>
                    </fieldset>

                    <button className="subscribe">
                      {state === "submitting" ? "Subscribing..." : "Subscribe"}
                    </button>
                  </Form>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
};
