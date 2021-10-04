import request from "supertest";

import { app } from "../../app";

test("201 on successful signin", async () => {
  await request(app).post("/signup").send({
    email: "wtf@wtf.com",
    password: "asda12ads",
  });

  const response = await request(app)
    .post("/signin")
    .send({
      email: "wtf@wtf.com",
      password: "asda12ads",
    })
    .expect(200);

  expect(response.get("Set-Cookie")).toBeDefined();
});

test("400 on signin with invalid email", () =>
  request(app)
    .post("/signin")
    .send({
      email: "wtf@",
      password: "asda12ads",
    })
    .expect(400));

test("400 on signin with invalid password", () =>
  request(app)
    .post("/signin")
    .send({
      email: "wtf@wtf.com",
      password: "_",
    })
    .expect(400));

test("400 on signin with a missing email", () =>
  request(app)
    .post("/signin")
    .send({
      password: "asda12ads",
    })
    .expect(400));

test("400 on signin with a missing password", () =>
  request(app)
    .post("/signin")
    .send({
      email: "wtf@wtf.com",
    })
    .expect(400));

test("400 on signin with a missing email and password", () =>
  request(app).post("/signin").send({}).expect(400));

test("400 on signin with an email that is not registered", () =>
  request(app)
    .post("/signin")
    .send({
      email: "wtf@wtf.com",
      password: "asda12ads",
    })
    .expect(400));

test("400 on signin with the wrong password", async () => {
  await request(app).post("/signup").send({
    email: "wtf@wtf.com",
    password: "asda12ads",
  });

  await request(app)
    .post("/signin")
    .send({
      email: "wtf@wtf.com",
      password: "asda12ad",
    })
    .expect(400);
});
