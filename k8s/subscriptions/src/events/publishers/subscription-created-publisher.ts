import { Publisher, Subjects, SubscriptionCreatedEvent } from "@tartine/common";

export class SubscriptionCreatedPublisher extends Publisher<SubscriptionCreatedEvent> {
  readonly subject = Subjects.SubscriptionCreated;
}
