import express, { Request, Response, NextFunction } from "express";
import { BadRequestError } from "@tartine/common";

import type Stripe from "stripe";

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

      /**
       *  event type payment_method.attached
          event type customer.source.created
          event type customer.created
          event type plan.created
          event type price.created
          event type charge.succeeded
          event type customer.updated
          event type invoice.created
          event type invoice.finalized
          -- created --
          event type invoice.paid
          event type invoice.payment_succeeded
          event type payment_intent.succeeded
          event type payment_intent.created
       */

      switch (event.type) {
        /**
         * Sent when the subscription is created.
         * The subscription status may be incomplete if customer authentication
         * is required to complete the payment or if you set payment_behavior to default_incomplete.
         * For more details, read about subscription payment behavior.
         */
        case "customer.subscription.created":
          let subscription = event.data.object as Stripe.Subscription;

          let customerExistingSubscription = await Subscription.findOne({
            stripeSubscriptionId: subscription.id,
          });

          if (customerExistingSubscription) {
            throw new BadRequestError(
              "Event customer.subscription.created contains a subscription already registered with us"
            );
          }

          let customerNewSubscription = Subscription.build({
            stripeSubscriptionId: subscription.id,
            stripeSubscription: subscription,
          });

          await customerNewSubscription.save();

          /**
           *
           */
          new SubscriptionCreatedPublisher(nats.client).publish({
            stripeSubscription: customerNewSubscription.stripeSubscription,
          });

          break;

        /**
         * Sent when the subscription is successfully started, after the payment is confirmed.
         * Also sent whenever a subscription is changed.
         * For example, adding a coupon, applying a discount, adding an invoice item,
         * and changing plans all trigger this event.
         */
        case "customer.subscription.updated":
          const subscriptionUpdate = event.data.object as Stripe.Subscription;

          const customerSubscriptionUpdate = await Subscription.findOne({
            stripeSubscriptionId: subscriptionUpdate.id,
          });

          if (!customerSubscriptionUpdate) {
            throw new BadRequestError(
              "Event customer.subscription.updated contains a subscription that is not registered with us"
            );
          }

          customerSubscriptionUpdate.set({
            stripeSubscription: subscriptionUpdate,
          });

          await customerSubscriptionUpdate.save();

          /**
           *
           */
          new SubscriptionUpdatedPublisher(nats.client).publish({
            stripeSubscriptionId:
              customerSubscriptionUpdate.stripeSubscription.id,
            stripeSubscription: customerSubscriptionUpdate.stripeSubscription,
            version: customerSubscriptionUpdate.version,
          });

          break;

        /**
         * TODO
         */
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
