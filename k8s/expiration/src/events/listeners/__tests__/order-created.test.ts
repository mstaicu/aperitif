import mongoose from "mongoose";
import { Message } from "node-nats-streaming";

import { OrderCreatedEvent, OrderStatus } from "@tartine/common";

import { Ticket } from "../../../models/ticket";

import { nats } from "../../nats";

import { OrderCreatedListener } from "../order-created";

test("updates the ticket document when an order for that ticket is created", async () => {
  const listener = new OrderCreatedListener(nats.client);

  const userId = new mongoose.Types.ObjectId().toHexString();
  const orderId = new mongoose.Types.ObjectId().toHexString();

  const ticket = Ticket.build({
    title: "concert",
    price: 99,
    userId,
  });

  await ticket.save();

  const data: OrderCreatedEvent["data"] = {
    id: orderId,
    version: 0,
    status: OrderStatus.Created,
    userId,
    expiresAt: "",
    ticket: {
      id: ticket.id,
      price: ticket.price,
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

  expect(updatedTicket!.orderId).toEqual(data.id);

  expect(message.ack).toBeCalled();

  expect(nats.client.publish).toHaveBeenCalled();

  const [firstInvocationArgs] = (nats.client.publish as jest.Mock).mock.calls;
  const [, secondArgument] = firstInvocationArgs;

  const ticketUpdatedData = JSON.parse(secondArgument);

  expect(data.id).toEqual(ticketUpdatedData.orderId);
});
