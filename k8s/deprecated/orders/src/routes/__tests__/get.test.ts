import request from "supertest";
import mongoose from "mongoose";

import { Ticket } from "../../models/ticket";

import { app } from "../../app";

test("401 on fetching another users order", async () => {
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: "concert",
    price: 20,
  });

  await ticket.save();

  const { body: order } = await request(app)
    .post("/")
    .set("Cookie", global.getSessionCookie())
    .send({ ticketId: ticket.id })
    .expect(201);

  await request(app)
    .get(`/${order.id}`)
    .set("Cookie", global.getSessionCookie())
    .send()
    .expect(401);
});

test("200 on fetching a specific order", async () => {
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

  const { body: fetchedOrder } = await request(app)
    .get(`/${order.id}`)
    .set("Cookie", userCookie)
    .send()
    .expect(200);

  expect(fetchedOrder.id).toEqual(order.id);
});
