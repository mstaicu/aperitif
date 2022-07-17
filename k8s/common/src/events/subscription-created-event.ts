import type Stripe from "stripe";

import { Subjects } from "./types/subjects";

export interface SubscriptionCreatedEvent {
  subject: Subjects.SubscriptionCreated;
  data: {
    stripeSubscription: Stripe.Subscription;
  };
}
