import Stripe from "stripe";
import request from "supertest";
import { sendMagicLink } from "@tartine/common";

import { stripe } from "../../../stripe";

import { app } from "../../../app";

/**
 * This is to simulate the Sendgrid API going down
 */
jest.mock("@tartine/common", () => ({
  ...jest.requireActual("@tartine/common"),
  sendMagicLink: jest.fn(),
}));

/**
 *
 */

let customer: Stripe.Customer;

beforeAll(async () => {
  customer = await stripe.customers.create({
    email: "customer@tma1.com",
    payment_method: "pm_card_visa",
    invoice_settings: { default_payment_method: "pm_card_visa" },
  });
});

afterAll(async () => {
  await stripe.customers.del(customer.id);
});

test("400 on sending a magic link to a missing email", () =>
  request(app).post("/token/send").send({}).expect(400));

test("400 on sending a magic link with invalid email", () =>
  request(app)
    .post("/token/send")
    .send({
      email: "customer@",
    })
    .expect(400));

test("400 on sending a magic link to an unregistered customer", () =>
  request(app)
    .post("/token/send")
    .send({
      email: "customer@google.com",
    })
    .expect(400));

test("400 on sending a magic link with Sendgrid down", async () => {
  (sendMagicLink as jest.Mock).mockRejectedValue({});

  await request(app)
    .post("/token/send")
    .send({
      email: customer.email,
    })
    .expect(400);
});

test("200 on sending a magic link to a existing customer", async () => {
  (sendMagicLink as jest.Mock).mockResolvedValue({});

  await request(app)
    .post("/token/send")
    .send({
      email: customer.email,
    })
    .expect(200);
});
