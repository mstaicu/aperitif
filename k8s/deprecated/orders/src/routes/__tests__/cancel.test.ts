import request from "supertest";
import mongoose from "mongoose";

import { OrderStatus } from "../../models/order";
import { Ticket } from "../../models/ticket";

import { nats } from "../../events/nats";

import { app } from "../../app";

test("204 on cancelling an order", async () => {
  const userCookie = global.getSessionCookie();

  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: "concert",
    price: 20,
  });

  await ticket.save();

  const { body: order } = await request(app)
    .post("/")
    .set("Cookie", userCookie)
    .send({ ticketId: ticket.id })
    .expect(201);

  const { body: cancelledOrder } = await request(app)
    .delete(`/${order.id}`)
    .set("Cookie", userCookie)
    .send()
    .expect(200);

  expect(cancelledOrder.status).toEqual(OrderStatus.Cancelled);

  expect(nats.client.publish).toBeCalled();
});
