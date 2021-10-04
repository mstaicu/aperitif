import request from "supertest";

import { Ticket } from "../../models/ticket";
import { nats } from "../../events/nats";

import { app } from "../../app";

test("401 on unauthenticated request", () =>
  request(app).post("/").send({}).expect(401));

test("400 on invalid ticket title", () =>
  request(app)
    .post("/")
    .set("Cookie", global.getSessionCookie())
    .send({
      price: 10,
    })
    .expect(400));

test("400 on invalid ticket price", () =>
  request(app)
    .post("/")
    .set("Cookie", global.getSessionCookie())
    .send({
      title: "Wat",
    })
    .expect(400));

test("201 on valid payload and user is signed in", async () => {
  let tickets = await Ticket.find({});

  expect(tickets.length).toBe(0);

  await request(app)
    .post("/")
    .set("Cookie", global.getSessionCookie())
    .send({
      title: "Nicky Minaj at O2",
      price: 10,
    })
    .expect(201);

  tickets = await Ticket.find({});

  expect(tickets.length).toBe(1);
});

test("201 on valid payload, emiting a creation event", async () => {
  await request(app)
    .post("/")
    .set("Cookie", global.getSessionCookie())
    .send({
      title: "Nicky Minaj at O2",
      price: 100,
    })
    .expect(201);

  expect(nats.client.publish).toBeCalled();
});
