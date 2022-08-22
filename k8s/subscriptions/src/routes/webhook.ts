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
        /**
         * Build the event from the Buffer request body, the Stripe signature header value and the webhook endpoint secret
         */
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

      // console.log("event.type", event.type);

      switch (event.type) {
        /**
         * Sent when the subscription is created.
         * The subscription status may be incomplete if customer authentication
         * is required to complete the payment or if you set payment_behavior to default_incomplete.
         * For more details, read about subscription payment behavior.
         */
        case "customer.subscription.created":
          let subscription = event.data.object as Stripe.Subscription;

          let customerExistingSubscription = await Subscription.findById(
            subscription.id
          );

          if (customerExistingSubscription) {
            throw new BadRequestError(
              "Event customer.subscription.created contains a subscription already registered with us"
            );
          }

          let customerNewSubscription = Subscription.build({
            id: subscription.id,
            cancel_at: subscription.cancel_at,
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_end: subscription.current_period_end,
            status: subscription.status,
          });

          await customerNewSubscription.save();

          /**
           *
           */
          new SubscriptionCreatedPublisher(nats.client).publish({
            id: subscription.id,
            cancel_at: subscription.cancel_at,
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_end: subscription.current_period_end,
            status: subscription.status,
            customer: subscription.customer,
          });

          break;

        /**
         * Sent when the subscription is successfully started, after the payment is confirmed.
         * Also sent whenever a subscription is changed.
         * For example, adding a coupon, applying a discount, adding an invoice item,
         * and changing plans all trigger this event.
         */
        case "customer.subscription.updated":
          let subscriptionUpdate = event.data.object as Stripe.Subscription;

          let existingSubscription = await Subscription.findById(
            subscriptionUpdate.id
          );

          if (!existingSubscription) {
            throw new BadRequestError(
              "Event customer.subscription.updated contains a subscription that is not registered with us"
            );
          }

          existingSubscription.set({
            cancel_at: subscriptionUpdate.cancel_at,
            cancel_at_period_end: subscriptionUpdate.cancel_at_period_end,
            current_period_end: subscriptionUpdate.current_period_end,
            status: subscriptionUpdate.status,
          });

          await existingSubscription.save();

          /**
           *
           */
          new SubscriptionUpdatedPublisher(nats.client).publish({
            id: existingSubscription.id,
            cancel_at: existingSubscription.cancel_at,
            cancel_at_period_end: existingSubscription.cancel_at_period_end,
            current_period_end: existingSubscription.current_period_end,
            status: existingSubscription.status,
            version: existingSubscription.version,
          });

          break;

        case "customer.subscription.deleted":
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
