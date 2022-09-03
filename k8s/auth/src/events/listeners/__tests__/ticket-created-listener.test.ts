import mongoose from "mongoose";
import { Message } from "node-nats-streaming";

import { TicketCreatedEvent } from "@tartine/common";

import { Ticket } from "../../../models/ticket";

import { nats } from "../../nats";

import { TicketCreatedListener } from "../subscription-created-listener";

test("creates and saves a ticket", async () => {
  const listener = new TicketCreatedListener(nats.client);

  const data: TicketCreatedEvent["data"] = {
    id: new mongoose.Types.ObjectId().toHexString(),
    version: 0,
    price: 10,
    title: "mongoose",
    userId: new mongoose.Types.ObjectId().toHexString(),
  };

  // @ts-ignore
  const message: Message = {
    ack: jest.fn(),
  };

  await listener.onMessage(data, message);

  const ticket = await Ticket.findById(data.id);

  expect(message.ack).toBeCalled();

  expect(ticket).toBeDefined();
  expect(ticket!.title).toEqual(data.title);
  expect(ticket!.price).toEqual(data.price);
});
