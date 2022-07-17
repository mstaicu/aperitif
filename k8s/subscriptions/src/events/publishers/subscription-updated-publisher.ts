import { Publisher, Subjects, SubscriptionUpdatedEvent } from "@tartine/common";

export class SubscriptionUpdatedPublisher extends Publisher<SubscriptionUpdatedEvent> {
  readonly subject = Subjects.SubscriptionUpdated;
}
