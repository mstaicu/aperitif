import { Message } from "node-nats-streaming";
import { Subjects, Listener, SubscriptionCreatedEvent } from "@tartine/common";

import { User } from "../../models/user";
import { Subscription } from "../../models/subscription";

// import { stripe } from "../../stripe";

export class SubscriptionCreatedListener extends Listener<SubscriptionCreatedEvent> {
  readonly subject = Subjects.SubscriptionCreated;

  queueGroupName = "subscriptions-service";

  onMessage = async (data: SubscriptionCreatedEvent["data"], msg: Message) => {
    try {
      let {
        id,
        cancel_at,
        cancel_at_period_end,
        current_period_end,
        customer,
        status,
      } = data;

      if (typeof customer !== "string") {
        throw new Error(
          "SubscriptionCreatedEvent contains a customer of type Stripe.Customer or Stripe.DeletedCustomer"
        );
      }

      // customer = await stripe.customers.retrieve(customer);

      // if (customer.deleted) {
      //   throw new Error(
      //     "SubscriptionCreatedEvent contains a customer of type Stripe.DeletedCustomer"
      //   );
      // }

      // if (!customer.email) {
      //   throw new Error(
      //     "SubscriptionCreatedEvent contains a customer with an invalid email address"
      //   );
      // }

      /**
       *
       */
      let registeredCustomer = await User.findById(customer);

      if (!registeredCustomer) {
        throw new Error(
          "SubscriptionCreatedEvent contains a customer that is not registered with us"
        );
      }

      let existingSubscription = await Subscription.findById(id);

      if (existingSubscription) {
        throw new Error(
          "SubscriptionCreatedEvent contains an existing subscription"
        );
      }

      /**
       *
       */
      let subscription = Subscription.build({
        id,
        cancel_at,
        cancel_at_period_end,
        current_period_end,
        status,
      });

      await subscription.save();

      registeredCustomer.set({
        subscription,
      });

      await registeredCustomer.save();

      msg.ack();
    } catch (err) {}
  };
}
