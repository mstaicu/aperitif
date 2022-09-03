import mongoose from "mongoose";
import { Message } from "node-nats-streaming";

import { TicketUpdatedEvent } from "@tartine/common";

import { Ticket } from "../../../models/ticket";

import { nats } from "../../nats";

import { TicketUpdatedListener } from "../ticket-updated-listener";

test("finds and updates a ticket", async () => {
  const listener = new TicketUpdatedListener(nats.client);

  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    price: 10,
    title: "mongoose",
  });

  await ticket.save();

  const data: TicketUpdatedEvent["data"] = {
    id: ticket.id,
    version: ticket.version + 1,
    price: 15,
    title: "mongoose plus",
    userId: new mongoose.Types.ObjectId().toHexString(),
  };

  // @ts-ignore
  const message: Message = {
    ack: jest.fn(),
  };

  await listener.onMessage(data, message);

  const updatedTicket = await Ticket.findById(ticket.id);

  expect(message.ack).toBeCalled();

  expect(updatedTicket!.title).toEqual(data.title);
  expect(updatedTicket!.price).toEqual(data.price);
  expect(updatedTicket!.version).toEqual(data.version);
});

/**
 * IMPORTANT
 */
test("does not ack the message if the event has a skipped document version", async () => {
  const listener = new TicketUpdatedListener(nats.client);

  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    price: 10,
    title: "mongoose",
  });

  await ticket.save();

  const data: TicketUpdatedEvent["data"] = {
    id: ticket.id,
    /**
     * Event that has a version far in the future from the current ticket version
     */
    version: ticket.version + 10,
    price: 15,
    title: "mongoose plus",
    userId: new mongoose.Types.ObjectId().toHexString(),
  };

  // @ts-ignore
  const message: Message = {
    ack: jest.fn(),
  };

  await listener.onMessage(data, message);

  expect(message.ack).not.toBeCalled();
});
