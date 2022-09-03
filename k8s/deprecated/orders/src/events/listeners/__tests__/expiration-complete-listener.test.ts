import mongoose from "mongoose";
import { Message } from "node-nats-streaming";

import { ExpirationCompleteEvent } from "@tartine/common";

import { Order, OrderStatus } from "../../../models/order";
import { Ticket } from "../../../models/ticket";

import { nats } from "../../nats";

import { ExpirationCompleteListener } from "../expiration-complete-listener";

test("updates an orders' status to 'Cancelled'", async () => {
  const listener = new ExpirationCompleteListener(nats.client);

  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: "concert",
    price: 20,
  });

  await ticket.save();

  const order = Order.build({
    status: OrderStatus.Created,
    userId: new mongoose.Types.ObjectId().toHexString(),
    expiresAt: new Date(),
    ticket,
  });

  await order.save();

  const data: ExpirationCompleteEvent["data"] = {
    orderId: order.id,
  };

  // @ts-ignore
  const message: Message = {
    ack: jest.fn(),
  };

  await listener.onMessage(data, message);

  const updatedOrder = await Order.findById(order.id);

  expect(message.ack).toHaveBeenCalled();

  expect(updatedOrder!.status).toEqual(OrderStatus.Cancelled);
});

test("emit an OrderCancelled event", async () => {
  const listener = new ExpirationCompleteListener(nats.client);

  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: "concert",
    price: 20,
  });

  await ticket.save();

  const order = Order.build({
    status: OrderStatus.Created,
    userId: new mongoose.Types.ObjectId().toHexString(),
    expiresAt: new Date(),
    ticket,
  });

  await order.save();

  const data: ExpirationCompleteEvent["data"] = {
    orderId: order.id,
  };

  // @ts-ignore
  const message: Message = {
    ack: jest.fn(),
  };

  await listener.onMessage(data, message);

  expect(nats.client.publish).toHaveBeenCalled();

  const [firstInvocationArgs] = (nats.client.publish as jest.Mock).mock.calls;
  const [, secondArgument] = firstInvocationArgs;

  const orderUpdatedData = JSON.parse(secondArgument);

  expect(orderUpdatedData.id).toEqual(order.id);
});
