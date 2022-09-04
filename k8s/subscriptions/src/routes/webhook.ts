import express, { Request, Response, NextFunction } from "express";
import { BadRequestError } from "@tartine/common";
/**
 *
 */
import type Stripe from "stripe";
/**
 *
 */
import { Subscription } from "../models/subscription";
/**
 *
 */
import { nats } from "../events/nats";
import {
  CustomerCreatedPublisher,
  SubscriptionCreatedPublisher,
  SubscriptionUpdatedPublisher,
} from "../events/publishers";
/**
 *
 */
import { stripe } from "../stripe";
/**
 *
 */
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
      let event: Stripe.Event;

      try {
        const webhookRawBody = req.body;
        const webhookStripeSignatureHeader = req.headers["stripe-signature"]!;
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

        /**
         * @throws Stripe.errors.StripeSignatureVerificationError
         */
        event = stripe.webhooks.constructEvent(
          webhookRawBody,
          webhookStripeSignatureHeader,
          webhookSecret
        );
      } catch (err) {
        throw new BadRequestError(
          "Something went wrong while constructing and verifying the signature of an Event from the provided details"
        );
      }

      switch (event.type) {
        case "customer.created":
          let { id, email } = event.data.object as Stripe.Customer;

          new CustomerCreatedPublisher(nats.client).publish({
            id,
            email,
          });

          break;

        case "customer.subscription.updated":
          let stripeSubscription = event.data.object as Stripe.Subscription;

          let subscription = await Subscription.findById(stripeSubscription.id);

          if (!subscription) {
            /**
             * Out-of-order Stripe event mitigation
             *
             * Phase 1
             *
             * Create a new subscription on a "customer.subscription.updated" event
             */

            if (typeof stripeSubscription.customer !== "string") {
              throw new BadRequestError(
                "Stripe event 'customer.subscription.updated' sent a 'customer' property that is not of type 'string'"
              );
            }

            subscription = Subscription.build({
              id: stripeSubscription.id,
              cancel_at: stripeSubscription.cancel_at,
              cancel_at_period_end: stripeSubscription.cancel_at_period_end,
              current_period_end: stripeSubscription.current_period_end,
              customerId: stripeSubscription.customer,
              status: stripeSubscription.status,
            });

            await subscription.save();

            /**
             * Out-of-order Stripe event mitigation
             *
             * Phase 2
             *
             * Emit a new subscription on a "customer.subscription.updated" event
             */
            new SubscriptionCreatedPublisher(nats.client).publish({
              id: subscription.id,
              cancel_at: subscription.cancel_at,
              cancel_at_period_end: subscription.cancel_at_period_end,
              current_period_end: subscription.current_period_end,
              customerId: subscription.customerId,
              status: subscription.status,
            });

            return res.sendStatus(200);
          }

          /**
           * Out-of-order Stripe event mitigation
           *
           * Phase 3
           *
           * Update the subscription on a "customer.subscription.updated" event
           */
          subscription.set({
            cancel_at: stripeSubscription.cancel_at,
            cancel_at_period_end: stripeSubscription.cancel_at_period_end,
            current_period_end: stripeSubscription.current_period_end,
            customerId: stripeSubscription.customer,
            status: stripeSubscription.status,
          });

          await subscription.save();

          /**
           * Out-of-order Stripe event mitigation
           *
           * Phase 4
           *
           * Emit the subscription update on a "customer.subscription.updated" event
           */
          new SubscriptionUpdatedPublisher(nats.client).publish({
            id: subscription.id,
            cancel_at: subscription.cancel_at,
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_end: subscription.current_period_end,
            customerId: subscription.customerId,
            status: subscription.status,
            version: subscription.version,
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
