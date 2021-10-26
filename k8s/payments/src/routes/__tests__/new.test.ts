import request from "supertest";
import mongoose from "mongoose";

import { Order, OrderStatus } from "../../models/order";
import { Payment } from "../../models/payment";

import { stripe } from "../../stripe";

import { app } from "../../app";

test("404 when trying to pay for an order that does not exist", () =>
  request(app)
    .post("/")
    .set("Cookie", global.getSessionCookie())
    .send({
      token: "asdasd",
      orderId: new mongoose.Types.ObjectId().toHexString(),
    })
    .expect(404));

test("401 when trying to pay for an order that does not belong to the user", async () => {
  const orderId = new mongoose.Types.ObjectId().toHexString();
  const userId = new mongoose.Types.ObjectId().toHexString();

  const order = Order.build({
    id: orderId,
    userId: userId,
    status: OrderStatus.Created,
    price: 10,
    version: 0,
  });

  await order.save();

  await request(app)
    .post("/")
    .set("Cookie", global.getSessionCookie())
    .send({ token: "asdasd", orderId: order.id })
    .expect(401);
});

test("400 when trying to pay for a cancelled order", async () => {
  const orderId = new mongoose.Types.ObjectId().toHexString();

  const userId = new mongoose.Types.ObjectId().toHexString();

  const order = Order.build({
    id: orderId,
    userId: userId,
    status: OrderStatus.Cancelled,
    price: 10,
    version: 0,
  });

  await order.save();

  await request(app)
    .post("/")
    .set("Cookie", global.getSessionCookie({ userId }))
    .send({ token: "asdasd", orderId: order.id })
    .expect(400);
});

test("201 when submitting a valid orderId and token", async () => {
  const orderId = new mongoose.Types.ObjectId().toHexString();
  const userId = new mongoose.Types.ObjectId().toHexString();

  const order = Order.build({
    id: orderId,
    userId: userId,
    status: OrderStatus.Created,
    price: 10,
    version: 0,
  });

  await order.save();

  await request(app)
    .post("/")
    .set("Cookie", global.getSessionCookie({ userId }))
    .send({ token: "tok_visa", orderId: order.id })
    .expect(201);

  expect(stripe.charges.create).toBeCalled();

  const [firstInvocationArgs] = (stripe.charges.create as jest.Mock).mock.calls;
  const [stripeChargeCreateArgument] = firstInvocationArgs;

  expect(stripeChargeCreateArgument.source).toEqual("tok_visa");
  expect(stripeChargeCreateArgument.amount).toEqual(order.price * 100);
  expect(stripeChargeCreateArgument.currency).toEqual("gbp");

  const payment = await Payment.findOne({
    orderId,
    // as in the __mocks__
    stripeChargeId: "randomChargeId",
  });

  expect(payment).not.toBeNull();
});

/**
 * Or, we can hit the real Stripe API
 *
 * 1. Rename the __mocks__ stripe.ts to stripe.ts.old
 * 2. Set the process.env.STRIPE_SECRET to the value of the secret from the cluster
 */
test.skip("201 when submitting a valid orderId and token to Stripe", async () => {
  const orderId = new mongoose.Types.ObjectId().toHexString();
  const userId = new mongoose.Types.ObjectId().toHexString();

  const price = Math.floor(Math.random() * 100000);

  const order = Order.build({
    id: orderId,
    userId: userId,
    status: OrderStatus.Created,
    price,
    version: 0,
  });

  await order.save();

  await request(app)
    .post("/")
    .set("Cookie", global.getSessionCookie({ userId }))
    .send({ token: "tok_visa", orderId: order.id })
    .expect(201);

  const { data: charges } = await stripe.charges.list({ limit: 50 });
  const charge = charges.find(({ amount }) => price * 100 == amount);

  expect(charge).toBeDefined();
  expect(charge!.currency).toEqual("gbp");
});
