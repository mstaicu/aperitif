import { Publisher, Subjects, TicketCreatedEvent } from "@tartine/common";

export class TicketCreatedPublisher extends Publisher<TicketCreatedEvent> {
  readonly subject = Subjects.TicketCreated;
}
