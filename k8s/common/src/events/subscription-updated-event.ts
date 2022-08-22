import type Stripe from "stripe";

import { Subjects } from "./types/subjects";

export interface SubscriptionUpdatedEvent {
  subject: Subjects.SubscriptionUpdated;
  data: {
    id: string;
    cancel_at: number | null;
    cancel_at_period_end: boolean;
    current_period_end: number;
    status: Stripe.Subscription.Status;
    version: number;
  };
}
