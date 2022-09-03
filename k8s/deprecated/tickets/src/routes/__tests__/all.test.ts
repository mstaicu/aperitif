import request from "supertest";

import { app } from "../../app";

test("200 on all tickets", async () => {
  const sessionCookie = global.getSessionCookie();

  await request(app)
    .post("/")
    .set("Cookie", sessionCookie)
    .send({
      title: "Nicky Minaj at O2",
      price: 10,
    })
    .expect(201);

  await request(app)
    .post("/")
    .set("Cookie", sessionCookie)
    .send({
      title: "Nicky Minaj at O2",
      price: 10,
    })
    .expect(201);

  const response = await request(app)
    .get("/")
    .set("Cookie", sessionCookie)
    .expect(200);

  expect(response.body.length).toBe(2);
});
