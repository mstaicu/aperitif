import request from "supertest";

import { app } from "../../app";

test("201 on successful register", () =>
  request(app)
    .post("/register")
    .send({
      email: "wtf@wtf.com",
      password: "asda12ads",
    })
    .expect(201));

test("400 on register with invalid email", () =>
  request(app)
    .post("/register")
    .send({
      email: "wtf@",
      password: "asda12ads",
    })
    .expect(400));

test("400 on register with invalid password", () =>
  request(app)
    .post("/register")
    .send({
      email: "wtf@wtf.com",
      password: "_",
    })
    .expect(400));

test("400 on register with a missing email", () =>
  request(app)
    .post("/register")
    .send({
      password: "asda12ads",
    })
    .expect(400));

test("400 on register with a missing password", () =>
  request(app)
    .post("/register")
    .send({
      email: "wtf@wtf.com",
    })
    .expect(400));

test("400 on register with a missing email and password", () =>
  request(app).post("/register").send({}).expect(400));

test("400 on register with an already registered email", async () => {
  await request(app)
    .post("/register")
    .send({
      email: "wtf@wtf.com",
      password: "asda12ads",
    })
    .expect(201);

  await request(app)
    .post("/register")
    .send({
      email: "wtf@wtf.com",
      password: "asda12ads",
    })
    .expect(400);
});
