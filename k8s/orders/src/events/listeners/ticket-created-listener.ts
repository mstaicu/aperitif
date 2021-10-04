import { Message } from "node-nats-streaming";
import { Subjects, Listener, TicketCreatedEvent } from "@tartine/common";

import { Ticket } from "../../models/ticket";

export class TicketCreatedListener extends Listener<TicketCreatedEvent> {
  readonly subject = Subjects.TicketCreated;

  queueGroupName = "orders-service";

  onMessage = async (data: TicketCreatedEvent["data"], msg: Message) => {
    try {
      const { id, title, price } = data;

      const ticket = Ticket.build({
        id,
        title,
        price,
      });

      await ticket.save();

      msg.ack();
    } catch (err) {
      /**
       * TODO: Handle out of order related errors. This is not the case for ticket created events
       */
    }
  };
}
