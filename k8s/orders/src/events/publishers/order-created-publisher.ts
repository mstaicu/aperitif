import { Publisher, OrderCreatedEvent, Subjects } from "@tartine/common";

export class OrderCreatedPublisher extends Publisher<OrderCreatedEvent> {
  readonly subject = Subjects.OrderCreated;
}
