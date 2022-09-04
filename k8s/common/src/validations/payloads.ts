import type { JwtPayload } from "jsonwebtoken";
import type Stripe from "stripe";

export type UserPayload = {
  user: {
    /**
     * Unique identifier for the object.
     */
    id: string;
    /**
     * Since the user can have a free tier, the 'subscription' property is optional
     */
    subscription?: {
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
    };
  };
};

export function hasUserPayload(obj: any): obj is UserPayload {
  return (
    typeof obj === "object" &&
    typeof obj.user === "object" &&
    typeof obj.user.id === "string"
  );
}

export function isJwtPayload(obj: any): obj is JwtPayload {
  return (
    typeof obj === "object" &&
    typeof obj.iat === "number" &&
    typeof obj.exp === "number"
  );
}

export function isAccessToken(obj: any): obj is UserPayload & JwtPayload {
  return isJwtPayload(obj) && hasUserPayload(obj);
}

export function isRefreshToken(obj: any): obj is UserPayload & JwtPayload {
  return isJwtPayload(obj) && hasUserPayload(obj);
}

export type MagicLinkPayload = {
  email: string;
  landingPage: string;
};

export function isMagicLinkPayload(obj: any): obj is MagicLinkPayload {
  return (
    typeof obj === "object" &&
    typeof obj.email === "string" &&
    typeof obj.landingPage === "string"
  );
}
