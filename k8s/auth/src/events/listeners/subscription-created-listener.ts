import { Message } from "node-nats-streaming";
import { Subjects, Listener, SubscriptionCreatedEvent } from "@tartine/common";

import { User } from "../../models/user";
import { Subscription } from "../../models/subscription";

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
        customerId,
        status,
      } = data;

      let user = await User.findById(customerId);

      if (!user) {
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
        customerId,
        status,
      });

      await subscription.save();

      user.set({
        subscription,
      });

      await user.save();

      msg.ack();
    } catch (err) {}
  };
}
