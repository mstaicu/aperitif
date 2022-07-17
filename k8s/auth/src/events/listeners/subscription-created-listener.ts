import { Message } from "node-nats-streaming";
import { Subjects, Listener, SubscriptionCreatedEvent } from "@tartine/common";

import { User } from "../../models/user";
import { Subscription } from "../../models/subscription";

import { stripe } from "../../stripe";

export class SubscriptionCreatedListener extends Listener<SubscriptionCreatedEvent> {
  readonly subject = Subjects.SubscriptionCreated;

  queueGroupName = "subscriptions-service";

  onMessage = async (data: SubscriptionCreatedEvent["data"], msg: Message) => {
    try {
      let { stripeSubscription } = data;

      if (typeof stripeSubscription.customer !== "string") {
        throw new Error(
          "SubscriptionCreatedEvent contains a customer of type Stripe.Customer or Stripe.DeletedCustomer"
        );
      }

      let stripeCustomer = await stripe.customers.retrieve(
        stripeSubscription.customer
      );

      if (stripeCustomer.deleted) {
        throw new Error(
          "SubscriptionCreatedEvent contains a customer of type Stripe.DeletedCustomer"
        );
      }

      if (!stripeCustomer.email) {
        throw new Error(
          "SubscriptionCreatedEvent contains a customer with an invalid email address"
        );
      }

      /**
       *
       */
      let existingUser = await User.findOne({ email: stripeCustomer.email });

      if (existingUser) {
        throw new Error(
          "SubscriptionCreatedEvent contains a customer that is already registered"
        );
      }

      let existingSubscription = await Subscription.findOne({
        stripeSubscriptionId: stripeSubscription.id,
      });

      if (existingSubscription) {
        throw new Error(
          "SubscriptionCreatedEvent contains an existing subscription"
        );
      }

      /**
       *
       */
      let subscription = Subscription.build({
        stripeSubscriptionId: stripeSubscription.id,
        stripeSubscription,
      });

      await subscription.save();

      /**
       *
       */
      let user = User.build({
        email: stripeCustomer.email,
        subscription,
      });

      await user.save();

      msg.ack();
    } catch (err) {}
  };
}
