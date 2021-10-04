import request from "supertest";

import { app } from "../../app";

test("200 on successful signout", async () => {
  await request(app)
    .post("/signup")
    .send({
      email: "wtf@wtf.com",
      password: "asda12ads",
    })
    .expect(201);

  const response = await request(app).post("/signout").send().expect(200);

  const [cookie] = response.get("Set-Cookie");

  expect(cookie.includes("express:sess=;")).toBeTruthy();
});
