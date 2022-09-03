import mongoose from "mongoose";
import { Message } from "node-nats-streaming";

import { OrderCancelledEvent } from "@tartine/common";

import { Ticket } from "../../../models/ticket";

import { nats } from "../../nats";

import { OrderCancelledListener } from "../order-cancelled";

test("updates the ticket document when an order for that ticket is cancelled", async () => {
  const listener = new OrderCancelledListener(nats.client);

  const userId = new mongoose.Types.ObjectId().toHexString();
  const orderId = new mongoose.Types.ObjectId().toHexString();

  const ticket = Ticket.build({
    title: "concert",
    price: 99,
    userId,
  });

  ticket.set({ orderId });

  await ticket.save();

  const data: OrderCancelledEvent["data"] = {
    id: orderId,
    version: 0,
    ticket: {
      id: ticket.id,
    },
  };

  // @ts-ignore
  const message: Message = {
    ack: jest.fn(),
  };

  await listener.onMessage(data, message);

  /**
   * check if the ticket document was updated in the collection
   */
  const updatedTicket = await Ticket.findById(ticket.id);

  expect(updatedTicket!.orderId).toEqual(undefined);

  expect(message.ack).toBeCalled();

  expect(nats.client.publish).toHaveBeenCalled();

  const [firstInvocationArgs] = (nats.client.publish as jest.Mock).mock.calls;
  const [, secondArgument] = firstInvocationArgs;

  const ticketUpdatedData = JSON.parse(secondArgument);

  expect(ticketUpdatedData.orderId).toEqual(undefined);
});
