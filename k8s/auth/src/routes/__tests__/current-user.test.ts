import request from "supertest";

import { app } from "../../app";

test("200 on authenticated current user data retrieve", async () => {
  const signupResponse = await request(app)
    .post("/signup")
    .send({
      email: "wtf@wtf.com",
      password: "asda12ads",
    })
    .expect(201);

  const cookie = signupResponse.get("Set-Cookie");

  const {
    body: { user },
  } = await request(app).get("/currentuser").set("Cookie", cookie).expect(200);

  expect(user).toBeTruthy();
});

test("200 on unauthenticated current user data retrieve", async () => {
  await request(app)
    .post("/signup")
    .send({
      email: "wtf@wtf.com",
      password: "asda12ads",
    })
    .expect(201);

  const {
    body: { user },
  } = await request(app).get("/currentuser").expect(200);

  expect(user).toBeFalsy();
});
