import type Stripe from "stripe";

import { Subjects } from "./types/subjects";

export interface SubscriptionUpdatedEvent {
  subject: Subjects.SubscriptionUpdated;
  data: {
    stripeSubscriptionId: string;
    stripeSubscription: Stripe.Subscription;
    version: number;
  };
}
