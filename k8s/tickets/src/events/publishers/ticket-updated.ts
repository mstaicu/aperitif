import { Publisher, Subjects, TicketUpdatedEvent } from "@tartine/common";

export class TicketUpdatedPublisher extends Publisher<TicketUpdatedEvent> {
  readonly subject = Subjects.TicketUpdated;
}
