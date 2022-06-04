import Stripe from "stripe";
import request from "supertest";
import { encryptMagicLinkPayload } from "@tartine/common";

import { stripe } from "../../../stripe";

import { app } from "../../../app";

let customer: Stripe.Customer;
let price: Stripe.Price;

beforeAll(async () => {
  customer = await stripe.customers.create({
    email: "customer@tma1.com",
    payment_method: "pm_card_visa",
    invoice_settings: { default_payment_method: "pm_card_visa" },
  });

  /**
   * Use our existing product offering for testing
   */
  let { data: prices } = await stripe.prices.list();
  [price] = prices;
});

afterAll(async () => {
  await stripe.customers.del(customer.id);
});

test("400 on supplying an empty magic token", () =>
  request(app).post("/token/validate").send({}).expect(400));

test("400 on supplying an invalid magic token", () =>
  request(app)
    .post("/token/validate")
    .send({ magicToken: "jibberish" })
    .expect(400));

test("400 on supplying an expired magic token", async () => {
  let tokenCreationDate = new Date();
  tokenCreationDate.setMinutes(tokenCreationDate.getMinutes() - 30);

  let payload = {
    email: customer.email,
    landingPage: "/dashboard",
    creationDate: tokenCreationDate.toISOString(),
  };

  let encryptedPayload = encryptMagicLinkPayload(JSON.stringify(payload));

  await request(app)
    .post("/token/validate")
    .send({ magicToken: encryptedPayload })
    .expect(400);
});

test("400 on supplying a magic token for an email address that is not registered", async () => {
  let payload = {
    email: "unknown@tma1.com",
    landingPage: "/dashboard",
    creationDate: new Date().toISOString(),
  };

  let encryptedPayload = encryptMagicLinkPayload(JSON.stringify(payload));

  await request(app)
    .post("/token/validate")
    .send({ magicToken: encryptedPayload })
    .expect(400);
});

test("400 on supplying a magic token for an account that has no subscriptions", async () => {
  let payload = {
    email: customer.email,
    landingPage: "/dashboard",
    creationDate: new Date().toISOString(),
  };

  let encryptedPayload = encryptMagicLinkPayload(JSON.stringify(payload));

  await request(app)
    .post("/token/validate")
    .send({ magicToken: encryptedPayload })
    .expect(400);
});

test("400 on supplying a magic token for a cancelled subscription", async () => {
  /**
   * Phase 1: Check if the droid has any active subscriptions
   */
  let { data: subscriptions } = await stripe.subscriptions.list({
    customer: customer.id,
  });

  expect(subscriptions.length).toBe(0);

  /**
   * Phase 2: Create one if he doesn't have one
   */

  let subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: price.id }],
  });

  /**
   * Phase 3: Cancel the subscription immediately, not at the end of the billing cycle, i.e. the recurring time frame
   */

  await stripe.subscriptions.del(subscription.id);

  /**
   *
   */

  let payload = {
    email: customer.email,
    landingPage: "/dashboard",
    creationDate: new Date().toISOString(),
  };

  let encryptedPayload = encryptMagicLinkPayload(JSON.stringify(payload));

  await request(app)
    .post("/token/validate")
    .send({ magicToken: encryptedPayload })
    .expect(400);
}, 10000);

test.skip("400 on supplying a magic token for a cancelled subscription after the end of the billing cycle", async () => {
  /**
   * Phase 1: Check if the droid has any active subscriptions
   */
  let { data: subscriptions } = await stripe.subscriptions.list({
    customer: customer.id,
  });

  expect(subscriptions.length).toBe(0);

  /**
   * Phase 2: Create one if he doesn't have one
   */

  let subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: price.id }],
  });

  /**
   * Phase 3: Cancel the subscription at the end of the billing cycle, i.e. the recurring time frame
   */
  await stripe.subscriptions.update(subscription.id, {
    cancel_at_period_end: true,
  });

  let tomorrow = new Date();
  tomorrow.setHours(tomorrow.getHours() + 25);

  jest.useFakeTimers("modern").setSystemTime(tomorrow);

  /**
   *
   */

  let payload = {
    email: customer.email,
    landingPage: "/dashboard",
    creationDate: new Date().toISOString(),
  };

  let encryptedPayload = encryptMagicLinkPayload(JSON.stringify(payload));

  await request(app)
    .post("/token/validate")
    .send({ magicToken: encryptedPayload })
    .expect(400);

  /**
   * Cleanup
   */

  await stripe.subscriptions.del(subscription.id);
}, 10000);

test("200 on supplying a magic token for an account that has an active subscription", async () => {
  /**
   * Phase 1: Check if the droid has any active subscriptions
   */
  let { data: subscriptions } = await stripe.subscriptions.list({
    customer: customer.id,
  });

  expect(subscriptions.length).toBe(0);

  /**
   * Phase 2: Create one if he doesn't have one
   */
  let subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: price.id }],
  });

  /**
   *
   */

  let payload = {
    email: customer.email,
    landingPage: "/dashboard",
    creationDate: new Date().toISOString(),
  };

  let encryptedPayload = encryptMagicLinkPayload(JSON.stringify(payload));

  await request(app)
    .post("/token/validate")
    .send({ magicToken: encryptedPayload })
    .expect(200);

  /**
   * Cleanup
   */

  await stripe.subscriptions.del(subscription.id);
}, 10000);

test("200 on supplying a magic token for an account that has a cancelled subscription at the end of the billing cycle", async () => {
  /**
   * Phase 1: Check if the droid has any active subscriptions
   */
  let { data: subscriptions } = await stripe.subscriptions.list({
    customer: customer.id,
  });

  expect(subscriptions.length).toBe(0);

  /**
   * Phase 2: Create one if he doesn't have one
   */

  let subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: price.id }],
  });

  /**
   * Phase 3: Cancel the subscription at the end of the billing cycle, i.e. the recurring time frame
   */
  await stripe.subscriptions.update(subscription.id, {
    cancel_at_period_end: true,
  });

  /**
   *
   */

  let payload = {
    email: customer.email,
    landingPage: "/dashboard",
    creationDate: new Date().toISOString(),
  };

  let encryptedPayload = encryptMagicLinkPayload(JSON.stringify(payload));

  await request(app)
    .post("/token/validate")
    .send({ magicToken: encryptedPayload })
    .expect(200);

  /**
   * Cleanup
   */

  await stripe.subscriptions.del(subscription.id);
}, 10000);
