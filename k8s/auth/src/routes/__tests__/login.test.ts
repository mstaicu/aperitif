import request from "supertest";

import { app } from "../../app";

test("201 on successful login", async () => {
  await request(app).post("/register").send({
    email: "wtf@wtf.com",
    password: "asda12ads",
  });

  const response = await request(app)
    .post("/login")
    .send({
      email: "wtf@wtf.com",
      password: "asda12ads",
    })
    .expect(200);

  // expect(response.get("Set-Cookie")).toBeDefined();
});

test("400 on login with invalid email", () =>
  request(app)
    .post("/login")
    .send({
      email: "wtf@",
      password: "asda12ads",
    })
    .expect(400));

test("400 on login with invalid password", () =>
  request(app)
    .post("/login")
    .send({
      email: "wtf@wtf.com",
      password: "_",
    })
    .expect(400));

test("400 on login with a missing email", () =>
  request(app)
    .post("/login")
    .send({
      password: "asda12ads",
    })
    .expect(400));

test("400 on login with a missing password", () =>
  request(app)
    .post("/login")
    .send({
      email: "wtf@wtf.com",
    })
    .expect(400));

test("400 on login with a missing email and password", () =>
  request(app).post("/login").send({}).expect(400));

test("400 on login with an email that is not registered", () =>
  request(app)
    .post("/login")
    .send({
      email: "wtf@wtf.com",
      password: "asda12ads",
    })
    .expect(400));

test("400 on login with the wrong password", async () => {
  await request(app).post("/register").send({
    email: "wtf@wtf.com",
    password: "asda12ads",
  });

  await request(app)
    .post("/login")
    .send({
      email: "wtf@wtf.com",
      password: "asda12ad",
    })
    .expect(400);
});
