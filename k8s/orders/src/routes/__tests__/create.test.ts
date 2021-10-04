import request from "supertest";
import mongoose from "mongoose";

import { Order, OrderStatus } from "../../models/order";
import { Ticket } from "../../models/ticket";

import { nats } from "../../events/nats";

import { app } from "../../app";

test("404 when trying to reserve a ticket that does not exist", () =>
  request(app)
    .post("/")
    .set("Cookie", global.getSessionCookie())
    .send({ ticketId: new mongoose.Types.ObjectId().toHexString() })
    .expect(404));

test("400 when trying to reserve a ticket that is alreay reserved", async () => {
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: "concert",
    price: 20,
  });

  await ticket.save();

  const order = Order.build({
    userId: new mongoose.Types.ObjectId().toHexString(),
    status: OrderStatus.Created,
    expiresAt: new Date(),
    ticket,
  });

  await order.save();

  await request(app)
    .post("/")
    .set("Cookie", global.getSessionCookie())
    .send({ ticketId: ticket.id })
    .expect(400);
});

test("201 when trying to reserve a ticket", async () => {
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: "concert",
    price: 20,
  });

  await ticket.save();

  const userSession = global.getSessionCookie();

  const submittedOrder = await request(app)
    .post("/")
    .set("Cookie", userSession)
    .send({ ticketId: ticket.id })
    .expect(201);

  const getSubmittedOrder = await request(app)
    .get(`/${submittedOrder.body.id}`)
    .set("Cookie", userSession)
    .send()
    .expect(200);

  expect(getSubmittedOrder.body.id).toBe(submittedOrder.body.id);

  expect(nats.client.publish).toBeCalled();
});
