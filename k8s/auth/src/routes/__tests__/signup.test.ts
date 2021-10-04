import request from "supertest";

import { app } from "../../app";

test("400 on signup with invalid email", () =>
  request(app)
    .post("/signup")
    .send({
      email: "wtf@",
      password: "asda12ads",
    })
    .expect(400));

test("400 on signup with invalid password", () =>
  request(app)
    .post("/signup")
    .send({
      email: "wtf@wtf.com",
      password: "_",
    })
    .expect(400));

test("400 on signup with a missing email", () =>
  request(app)
    .post("/signup")
    .send({
      password: "asda12ads",
    })
    .expect(400));

test("400 on signup with a missing password", () =>
  request(app)
    .post("/signup")
    .send({
      email: "wtf@wtf.com",
    })
    .expect(400));

test("400 on signup with a missing email and password", () =>
  request(app).post("/signup").send({}).expect(400));

test("400 on signup with an already registered email", async () => {
  await request(app)
    .post("/signup")
    .send({
      email: "wtf@wtf.com",
      password: "asda12ads",
    })
    .expect(201);

  await request(app)
    .post("/signup")
    .send({
      email: "wtf@wtf.com",
      password: "asda12ads",
    })
    .expect(400);
});

test("201 on successful signup", async () => {
  const response = await request(app)
    .post("/signup")
    .send({
      email: "wtf@wtf.com",
      password: "asda12ads",
    })
    .expect(201);

  expect(response.get("Set-Cookie")).toBeDefined();
});
