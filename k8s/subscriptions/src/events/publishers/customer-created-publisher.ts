import { Publisher, Subjects, CustomerCreatedEvent } from "@tartine/common";

export class CustomerCreatedPublisher extends Publisher<CustomerCreatedEvent> {
  readonly subject = Subjects.CustomerCreated;
}
