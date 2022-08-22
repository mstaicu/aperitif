import type Stripe from "stripe";

import { Subjects } from "./types/subjects";

export interface SubscriptionCreatedEvent {
  subject: Subjects.SubscriptionCreated;
  data: {
    id: string;
    cancel_at: number | null;
    cancel_at_period_end: boolean;
    current_period_end: number;
    customer: string | Stripe.Customer | Stripe.DeletedCustomer;
    status: Stripe.Subscription.Status;
  };
}
