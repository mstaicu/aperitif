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
        case "checkout.session.completed":
          var session = event.data.object as Stripe.Checkout.Session;

          /**
           * https://stripe.com/docs/api/checkout/sessions/object#checkout_session_object-subscription
           */
          var subscriptionId = session.subscription as string;

          if (await Subscription.findById(subscriptionId)) {
            throw new BadRequestError(
              "Stripe event 'checkout.session.completed' contains the id of an existing subscription"
            );
          }

          var stripeSubscription = await stripe.subscriptions.retrieve(
            subscriptionId
          );

          if (typeof stripeSubscription.customer !== "string") {
            throw new BadRequestError(
              "Stripe event 'checkout.session.completed' contains a customer object instead of a customer id"
            );
          }

          var newSubscription = Subscription.build({
            id: stripeSubscription.id,
            cancel_at: stripeSubscription.cancel_at,
            cancel_at_period_end: stripeSubscription.cancel_at_period_end,
            current_period_end: stripeSubscription.current_period_end,
            customerId: stripeSubscription.customer,
            status: stripeSubscription.status,
          });

          await newSubscription.save();

          new SubscriptionCreatedPublisher(nats.client).publish({
            id: newSubscription.id,
            cancel_at: newSubscription.cancel_at,
            cancel_at_period_end: newSubscription.cancel_at_period_end,
            current_period_end: newSubscription.current_period_end,
            customerId: newSubscription.customerId,
            status: newSubscription.status,
          });

          break;

        /**
         * Sent each billing interval when a payment succeeds
         */
        case "invoice.paid":
          var invoice = event.data.object as Stripe.Invoice;

          /**
           * https://stripe.com/docs/api/invoices/object#invoice_object-subscription
           */
          var subscriptionId = invoice.subscription as string;

          var existingSubscription = await Subscription.findById(
            subscriptionId
          );

          if (!existingSubscription) {
            throw new BadRequestError(
              "Stripe event 'checkout.session.completed' contains the id of a subscription that is not registered with us"
            );
          }

          var stripeSubscription = await stripe.subscriptions.retrieve(
            subscriptionId
          );

          if (typeof stripeSubscription.customer !== "string") {
            throw new BadRequestError(
              "Stripe event 'checkout.session.completed' contains a customer object instead of a customer id"
            );
          }

          existingSubscription.set({
            cancel_at: stripeSubscription.cancel_at,
            cancel_at_period_end: stripeSubscription.cancel_at_period_end,
            current_period_end: stripeSubscription.current_period_end,
            customerId: stripeSubscription.customer,
            status: stripeSubscription.status,
          });

          await existingSubscription.save();

          new SubscriptionUpdatedPublisher(nats.client).publish({
            id: existingSubscription.id,
            cancel_at: existingSubscription.cancel_at,
            cancel_at_period_end: existingSubscription.cancel_at_period_end,
            current_period_end: existingSubscription.current_period_end,
            customerId: existingSubscription.customerId,
            status: existingSubscription.status,
            version: existingSubscription.version,
          });

          break;

        // /**
        //  * Sent each billing interval if there is an issue with your customer’s payment method
        //  */
        // case "invoice.payment_failed":
        //   let invoice = event.data.object as Stripe.Invoice;

        //   let invoiceSubscriptionId = invoice.subscription as string;

        //   new SubscriptionUpdatedPublisher(nats.client).publish({
        //     id: subscription.id,
        //     cancel_at: subscription.cancel_at,
        //     cancel_at_period_end: subscription.cancel_at_period_end,
        //     current_period_end: subscription.current_period_end,
        //     customerId: subscription.customerId,
        //     status: subscription.status,
        //     version: subscription.version,
        //   });

        //   break;

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
