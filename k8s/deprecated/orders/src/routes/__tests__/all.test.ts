import request from "supertest";
import mongoose from "mongoose";

import { Ticket } from "../../models/ticket";

import { app } from "../../app";

const buildTicket = async () => {
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: "concert",
    price: 20,
  });

  await ticket.save();

  return ticket;
};

test("200 when fetching orders for a particular user", async () => {
  /**
   * Create 3 tickets
   */

  const ticketOne = await buildTicket();
  const ticketTwo = await buildTicket();
  const ticketThree = await buildTicket();

  const userOne = global.getSessionCookie();
  const userTwo = global.getSessionCookie();

  /**
   * Create 1 order as user #1
   */

  await request(app)
    .post("/")
    .set("Cookie", userOne)
    .send({ ticketId: ticketOne.id })
    .expect(201);

  /**
   * Create 2 orders as user #2
   */

  const { body: orderOne } = await request(app)
    .post("/")
    .set("Cookie", userTwo)
    .send({ ticketId: ticketTwo.id })
    .expect(201);
  const { body: orderTwo } = await request(app)
    .post("/")
    .set("Cookie", userTwo)
    .send({ ticketId: ticketThree.id })
    .expect(201);

  /**
   * Get orders for user #2
   */
  const response = await request(app)
    .get("/")
    .set("Cookie", userTwo)
    .expect(200);

  /**
   * Make sure we got only orders for user #2
   */

  expect(response.body.length).toEqual(2);

  expect(response.body[0].id).toEqual(orderOne.id);
  expect(response.body[1].id).toEqual(orderTwo.id);
  expect(response.body[0].ticket.id).toEqual(ticketTwo.id);
  expect(response.body[1].ticket.id).toEqual(ticketThree.id);
});
