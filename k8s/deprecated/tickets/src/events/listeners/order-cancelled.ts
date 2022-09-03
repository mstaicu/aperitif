import { Message } from "node-nats-streaming";
import { Listener, OrderCancelledEvent, Subjects } from "@tartine/common";

import { Ticket } from "../../models/ticket";

import { TicketUpdatedPublisher } from "../publishers";

export class OrderCancelledListener extends Listener<OrderCancelledEvent> {
  readonly subject = Subjects.OrderCancelled;

  queueGroupName = "tickets-service";

  onMessage = async (data: OrderCancelledEvent["data"], msg: Message) => {
    try {
      const ticket = await Ticket.findById(data.ticket.id);

      if (!ticket) {
        throw new Error("Ticket not found");
      }

      ticket.set({
        orderId: undefined,
      });

      await ticket.save();

      /**
       * Access the NATS client off the Listener by making the client protected on the Listener base class
       */
      await new TicketUpdatedPublisher(this.client).publish({
        id: ticket.id,
        price: ticket.price,
        title: ticket.title,
        userId: ticket.userId,
        orderId: ticket.orderId,
        version: ticket.version,
      });

      msg.ack();
    } catch (err) {}
  };
}
