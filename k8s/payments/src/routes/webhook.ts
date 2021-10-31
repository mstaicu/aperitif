import express, { Request, Response, NextFunction } from "express";
import type Stripe from "stripe";

import { Payment } from "../models/payment";

import { nats } from "../events/nats";
import { PaymentCreatedPublisher } from "../events/publishers";

import { stripe } from "../stripe";

const router = express.Router();

router.post(
  "/webhook",
  /**
   * Default 'type' value is 'application/octet-stream'
   */
  express.raw({ type: "application/json" }),
  /**
   *
   */
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      /**
       * Build the event from the Buffer request body, the Stripe signature header value and the webhook endpoint secret
       */
      const webhookRawBody = req.body;
      const webhookStripeSignatureHeader = req.headers["stripe-signature"]!;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

      /**
       * @throws Stripe.errors.StripeSignatureVerificationError
       * 
       * Since this error is not of type CustomError from @tartine/common
       * the default response of the error middleware is 400 code
       */
      const event = stripe.webhooks.constructEvent(
        webhookRawBody,
        webhookStripeSignatureHeader,
        webhookSecret
      );

      switch (event.type) {
        case "payment_intent.succeeded":
          /**
           * TODO: Move the case handler into its own function
           */

          /**
           * https://stripe.com/docs/api/events/object
           */
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const orderId = paymentIntent.metadata.orderId;

          const paymentProcessed = await Payment.findOne({ orderId });

          if (paymentProcessed) {
            return;
          }

          const payment = Payment.build({
            orderId,
            stripePaymentIntentId: paymentIntent.id,
          });

          await payment.save();

          new PaymentCreatedPublisher(nats.client).publish({
            id: payment.id,
            orderId: payment.orderId,
            stripePaymentIntentId: payment.stripePaymentIntentId,
          });

          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  }
);

export { router as stripeWebhookRouter };
