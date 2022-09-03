import mongoose from "mongoose";
import { Message } from "node-nats-streaming";

import { OrderCreatedEvent } from "@tartine/common";

import { Order, OrderStatus } from "../../../models/order";

import { nats } from "../../nats";

import { OrderCreatedListener } from "../order-created-listener";

test("creates and saves an order on order:created event", async () => {
  const listener = new OrderCreatedListener(nats.client);

  const data: OrderCreatedEvent["data"] = {
    id: new mongoose.Types.ObjectId().toHexString(),
    version: 0,
    userId: new mongoose.Types.ObjectId().toHexString(),
    status: OrderStatus.Created,
    expiresAt: "tomorrow",
    ticket: {
      id: new mongoose.Types.ObjectId().toHexString(),
      price: 10,
    },
  };

  // @ts-ignore
  const message: Message = {
    ack: jest.fn(),
  };

  await listener.onMessage(data, message);

  const order = await Order.findById(data.id);

  expect(order).toBeDefined();
  expect(order!.price).toEqual(data.ticket.price);
});

test("acks the message when receiving an order:created event", async () => {
  const listener = new OrderCreatedListener(nats.client);

  const data: OrderCreatedEvent["data"] = {
    id: new mongoose.Types.ObjectId().toHexString(),
    version: 0,
    userId: new mongoose.Types.ObjectId().toHexString(),
    status: OrderStatus.Created,
    expiresAt: "tomorrow",
    ticket: {
      id: new mongoose.Types.ObjectId().toHexString(),
      price: 10,
    },
  };

  // @ts-ignore
  const message: Message = {
    ack: jest.fn(),
  };

  await listener.onMessage(data, message);

  expect(message.ack).toBeCalled();
});
