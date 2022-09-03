import mongoose from "mongoose";
import { Message } from "node-nats-streaming";

import { OrderCancelledEvent } from "@tartine/common";

import { Order, OrderStatus } from "../../../models/order";

import { nats } from "../../nats";

import { OrderCancelledListener } from "../order-cancelled-listener";

test("changes the status of an order to cancelled when receiving an order:cancelled event", async () => {
  const listener = new OrderCancelledListener(nats.client);

  const orderId = new mongoose.Types.ObjectId().toHexString();
  const userId = new mongoose.Types.ObjectId().toHexString();
  const ticketId = new mongoose.Types.ObjectId().toHexString();

  const order = Order.build({
    id: orderId,
    status: OrderStatus.Created,
    userId: userId,
    price: 10,
    version: 0,
  });

  await order.save();

  const data: OrderCancelledEvent["data"] = {
    id: orderId,
    version: 1,
    ticket: {
      id: ticketId,
    },
  };

  // @ts-ignore
  const message: Message = {
    ack: jest.fn(),
  };

  await listener.onMessage(data, message);

  const savedOrder = await Order.findById(data.id);

  expect(savedOrder).toBeDefined();
  expect(savedOrder!.status).toEqual(OrderStatus.Cancelled);
});

test("acks the message when receiving an order:cancelled event", async () => {
  const listener = new OrderCancelledListener(nats.client);

  const orderId = new mongoose.Types.ObjectId().toHexString();
  const userId = new mongoose.Types.ObjectId().toHexString();
  const ticketId = new mongoose.Types.ObjectId().toHexString();

  const order = Order.build({
    id: orderId,
    status: OrderStatus.Created,
    userId: userId,
    price: 10,
    version: 0,
  });

  await order.save();

  const data: OrderCancelledEvent["data"] = {
    id: orderId,
    version: 1,
    ticket: {
      id: ticketId,
    },
  };

  // @ts-ignore
  const message: Message = {
    ack: jest.fn(),
  };

  await listener.onMessage(data, message);

  expect(message.ack).toBeCalled();
});
