import { Publisher, OrderCancelledEvent, Subjects } from "@tartine/common";

export class OrderCancelledPublisher extends Publisher<OrderCancelledEvent> {
  readonly subject = Subjects.OrderCancelled;
}
