import type { JwtPayload } from "jsonwebtoken";
import type Stripe from "stripe";

export type SessionPayload = {
  user: {
    /**
     * Unique identifier for the object.
     */
    id: string;
    /**
     *
     */
    subscription: {
      /**
       * Unique identifier for the object.
       */
      id: string;
      /**
       * Possible values are `incomplete`, `incomplete_expired`, `trialing`, `active`, `past_due`, `canceled`, or `unpaid`.
       *
       * For `collection_method=charge_automatically` a subscription moves into `incomplete` if the initial payment attempt fails. A subscription in this state can only have metadata and default_source updated. Once the first invoice is paid, the subscription moves into an `active` state. If the first invoice is not paid within 23 hours, the subscription transitions to `incomplete_expired`. This is a terminal state, the open invoice will be voided and no further invoices will be generated.
       *
       * A subscription that is currently in a trial period is `trialing` and moves to `active` when the trial period is over.
       *
       * If subscription `collection_method=charge_automatically` it becomes `past_due` when payment to renew it fails and `canceled` or `unpaid` (depending on your subscriptions settings) when Stripe has exhausted all payment retry attempts.
       *
       * If subscription `collection_method=send_invoice` it becomes `past_due` when its invoice is not paid by the due date, and `canceled` or `unpaid` if it is still not paid by an additional deadline after that. Note that when a subscription has a status of `unpaid`, no subsequent invoices will be attempted (invoices will be created, but then immediately automatically closed). After receiving updated payment information from a customer, you may choose to reopen and pay their closed invoices.
       */
      status: Stripe.Subscription.Status;
      /**
       * A date in the future at which the subscription will automatically get canceled
       */
      cancel_at: number | null;
      /**
       * If the subscription has been canceled with the `at_period_end` flag set to `true`, `cancel_at_period_end` on the subscription will be true. You can use this attribute to determine whether a subscription that has a status of active is scheduled to be canceled at the end of the current period.
       */
      cancel_at_period_end: boolean;
      /**
       * Start of the current period that the subscription has been invoiced for.
       */
      current_period_start: number;
      /**
       * End of the current period that the subscription has been invoiced for. At the end of this period, a new invoice will be created.
       */
      current_period_end: number;
      /**
       *
       */
      product: {
        /**
         * The ID of the product this price is associated with.
         */
        id: string | Stripe.Product | Stripe.DeletedProduct;
      };
      /**
       *
       */
      price: {
        /**
         * Unique identifier for the object.
         */
        id: string;
        /**
         * Three-letter [ISO currency code](https://www.iso.org/iso-4217-currency-codes.html), in lowercase. Must be a [supported currency](https://stripe.com/docs/currencies).
         */
        currency: string;
        /**
         * The unit amount in %s to be charged, represented as a whole integer if possible. Only set if `billing_scheme=per_unit`.
         */
        unit_amount: number | null;
      };
    };
  };
};

export function hasSessionPayload(
  obj: any
): obj is JwtPayload & SessionPayload {
  return (
    typeof obj === "object" &&
    typeof obj.user === "object" &&
    typeof obj.user.id === "string" &&
    typeof obj.user.subscription === "object" &&
    typeof obj.user.subscription.id === "string" &&
    typeof obj.user.subscription.status === "string" &&
    (typeof obj.user.subscription.cancel_at === "number" ||
      /**
       * typeof null === 'object'
       */
      typeof obj.user.subscription.cancel_at === "object") &&
    typeof obj.user.subscription.cancel_at_period_end === "boolean" &&
    typeof obj.user.subscription.current_period_start === "number" &&
    typeof obj.user.subscription.current_period_end === "number" &&
    typeof obj.user.subscription.product === "object" &&
    typeof obj.user.subscription.product.id === "string" &&
    typeof obj.user.subscription.price === "object" &&
    typeof obj.user.subscription.price.id === "string" &&
    typeof obj.user.subscription.price.currency === "string" &&
    (typeof obj.user.subscription.price.unit_amount === "number" ||
      typeof obj.user.subscription.price.unit_amount === null)
  );
}

export type MagicLinkPayload = {
  email: string;
  landingPage: string;
  creationDate: string;
};

export function isMagicLinkPayload(obj: any): obj is MagicLinkPayload {
  return (
    typeof obj === "object" &&
    typeof obj.email === "string" &&
    typeof obj.landingPage === "string" &&
    typeof obj.creationDate === "string"
  );
}
