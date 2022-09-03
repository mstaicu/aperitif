import { Publisher, Subjects, PaymentCreatedEvent } from "@tartine/common";

export class PaymentCreatedPublisher extends Publisher<PaymentCreatedEvent> {
  readonly subject = Subjects.PaymentCreated;
}
