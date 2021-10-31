// const payload = {
//   id: "evt_test_webhook",
//   object: "event",
//   type: "payment_intent.succeeded",
//   data: {
//     object: {
//       id: "payment-intent-id",
//       metadata: {
//         orderId: "insert-order-id",
//       },
//     },
//   },
// };

// const paymentIntent = await stripe.paymentIntents.create(
//   {
//     currency: "gbp",
//     amount: order.price * 100,
//     metadata: {
//       orderId: order.id,
//     },
//   },
//   { idempotencyKey: order.id }
// );

// const payload = {
//   id: "evt_test_webhook",
//   object: "event",
//   type: "payment_intent.succeeded",
//   data: {
//     object: paymentIntent,
//   },
// };

// const payloadString = JSON.stringify(payload, null, 2);
// const secret = process.env.STRIPE_WEBHOOK_SECRET

// const header = stripe.webhooks.generateTestHeaderString({
//   payload: payloadString,
//   secret,
// });

// send request with 'stripe-signature' header and the 'header' value

// const event = stripe.webhooks.constructEvent(payloadString, header, secret);
