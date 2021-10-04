import { Message } from "node-nats-streaming";
import { Subjects, Listener, TicketUpdatedEvent } from "@tartine/common";

import { Ticket } from "../../models/ticket";

export class TicketUpdatedListener extends Listener<TicketUpdatedEvent> {
  readonly subject = Subjects.TicketUpdated;

  queueGroupName = "orders-service";

  onMessage = async (data: TicketUpdatedEvent["data"], msg: Message) => {
    try {
      const ticket = await Ticket.findByEvent(data);

      if (!ticket) {
        throw new Error("Ticket not found");
      }

      const { title, price } = data;

      ticket.set({
        title,
        price,
      });

      await ticket.save();

      msg.ack();
    } catch (err) {
      /**
       * TODO: Handle out of order related errors
       */
    }
  };
}
