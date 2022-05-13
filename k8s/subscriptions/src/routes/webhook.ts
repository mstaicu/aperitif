import express, { Request, Response, NextFunction } from "express";

import { stripe } from "../stripe";
// import { nats } from "../events/nats";

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
        case "checkout.session.completed":
          /**
           * TODO: Emit events
           */
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
