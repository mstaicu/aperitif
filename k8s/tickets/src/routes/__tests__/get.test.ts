import request from "supertest";
import mongoose from "mongoose";

import { app } from "../../app";

test("401 on unauthenticated request", async () => {
  const ticketId = new mongoose.Types.ObjectId().toHexString();

  await request(app).get(`/${ticketId}`).expect(401);
});

test("400 on invalid ticket id", () =>
  request(app)
    .get("/funnyTicketId")
    .set("Cookie", global.getSessionCookie())
    .expect(400));

test("404 on ticket not found", async () => {
  const ticketId = new mongoose.Types.ObjectId().toHexString();

  await request(app)
    .get(`/${ticketId}`)
    .set("Cookie", global.getSessionCookie())
    .expect(404);
});

test("200 on existing ticket and user signed in", async () => {
  const sessionCookie = global.getSessionCookie();

  const response = await request(app)
    .post("/")
    .set("Cookie", sessionCookie)
    .send({
      title: "Nicky Minaj at O2",
      price: 10,
    })
    .expect(201);

  await request(app)
    .get(`/${response.body.id}`)
    .set("Cookie", sessionCookie)
    .expect(200);
});
