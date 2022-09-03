import request from "supertest";
import mongoose from "mongoose";

import { nats } from "../../events/nats";

import { Ticket } from "../../models/ticket";

import { app } from "../../app";

test("400 on invalid payload, no title", async () => {
  const sessionCookie = global.getSessionCookie();

  const createResponse = await request(app)
    .post("/")
    .set("Cookie", sessionCookie)
    .send({
      title: "Nicky Minaj at O2",
      price: 10,
    })
    .expect(201);

  await request(app)
    .put(`/${createResponse.body.id}`)
    .set("Cookie", sessionCookie)
    .send({
      price: 10,
    })
    .expect(400);
});

test("400 on invalid payload, no price", async () => {
  const sessionCookie = global.getSessionCookie();

  const createResponse = await request(app)
    .post("/")
    .set("Cookie", sessionCookie)
    .send({
      title: "Nicky Minaj at O2",
      price: 10,
    })
    .expect(201);

  await request(app)
    .put(`/${createResponse.body.id}`)
    .set("Cookie", sessionCookie)
    .send({
      title: "Nicky Minaj at Phonox",
    })
    .expect(400);
});

test("400 when trying to edit a reserved ticket", async () => {
  const sessionCookie = global.getSessionCookie();

  const response = await request(app)
    .post("/")
    .set("Cookie", sessionCookie)
    .send({
      title: "Nicky Minaj at O2",
      price: 10,
    })
    .expect(201);

  /**
   * Reserve the ticket
   */
  const ticket = await Ticket.findById(response.body.id);

  ticket!.set({
    orderId: new mongoose.Types.ObjectId().toHexString(),
  });

  await ticket!.save();

  /**
   * Attempt to edit a reserved ticket
   */
  await request(app)
    .put(`/${response.body.id}`)
    .set("Cookie", sessionCookie)
    .send({
      title: "Nicky Minaj at Phonox",
    })
    .expect(400);
});

test("401 on unauthenticated request", async () => {
  const sessionCookie = global.getSessionCookie();

  const createResponse = await request(app)
    .post("/")
    .set("Cookie", sessionCookie)
    .send({
      title: "Nicky Minaj at O2",
      price: 10,
    })
    .expect(201);

  await request(app)
    .put(`/${createResponse.body.id}`)
    .send({
      title: "Nicky Minaj at Phonox",
      price: 20,
    })
    .expect(401);
});

test("401 on updating a resource that the user does not own", async () => {
  const resourceOwnerCookie = global.getSessionCookie();

  const createResponse = await request(app)
    .post("/")
    .set("Cookie", resourceOwnerCookie)
    .send({
      title: "Nicky Minaj at O2",
      price: 10,
    })
    .expect(201);

  const notResourceOwnerCookie = global.getSessionCookie();

  await request(app)
    .put(`/${createResponse.body.id}`)
    .set("Cookie", notResourceOwnerCookie)
    .send({ title: "Nicky Minaj at Phonox", price: 10 })
    .expect(401);

  /**
   * Making sure no update was made
   */
  const getResponse = await request(app)
    .get(`/${createResponse.body.id}`)
    .set("Cookie", resourceOwnerCookie)
    .expect(200);

  expect(getResponse.body.title).toBe(createResponse.body.title);
});

test("404 on non existing ticket", async () => {
  const ticketId = new mongoose.Types.ObjectId().toHexString();

  await request(app)
    .put(`/${ticketId}`)
    .set("Cookie", global.getSessionCookie())
    .send({ title: "wat", price: 20 })
    .expect(404);
});

test("200 on existing ticket, user signed in and user owns the ticket", async () => {
  const sessionCookie = global.getSessionCookie();

  const createResponse = await request(app)
    .post("/")
    .set("Cookie", sessionCookie)
    .send({
      title: "Nicky Minaj at O2",
      price: 10,
    })
    .expect(201);

  await request(app)
    .put(`/${createResponse.body.id}`)
    .set("Cookie", sessionCookie)
    .send({ title: "Nicky Minaj at Phonox", price: 30 })
    .expect(200);

  const getResponse = await request(app)
    .get(`/${createResponse.body.id}`)
    .set("Cookie", sessionCookie)
    .expect(200);

  expect(getResponse.body.title).toBe("Nicky Minaj at Phonox");
  expect(getResponse.body.price).toBe(30);
});

test("200 on existing ticket, user signed in, owns the ticket, emitting an updated event", async () => {
  const sessionCookie = global.getSessionCookie();

  const createResponse = await request(app)
    .post("/")
    .set("Cookie", sessionCookie)
    .send({
      title: "Nicky Minaj at O2",
      price: 10,
    })
    .expect(201);

  await request(app)
    .put(`/${createResponse.body.id}`)
    .set("Cookie", sessionCookie)
    .send({ title: "Nicky Minaj at Phonox", price: 30 })
    .expect(200);

  expect(nats.client.publish).toBeCalled();
});
