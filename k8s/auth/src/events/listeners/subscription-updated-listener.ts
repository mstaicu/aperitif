import { Message } from "node-nats-streaming";
import { Subjects, Listener, SubscriptionUpdatedEvent } from "@tartine/common";

import { Subscription } from "../../models/subscription";

export class SubscriptionUpdatedListener extends Listener<SubscriptionUpdatedEvent> {
  readonly subject = Subjects.SubscriptionUpdated;

  queueGroupName = "subscriptions-service";

  onMessage = async (data: SubscriptionUpdatedEvent["data"], msg: Message) => {
    try {
      let existingSubscription = await Subscription.findByEvent(data);

      if (!existingSubscription) {
        throw new Error(
          "SubscriptionUpdatedEvent contains an out-of-order version of an updated subscription"
        );
      }

      existingSubscription.set({
        cancel_at: data.cancel_at,
        cancel_at_period_end: data.cancel_at_period_end,
        current_period_end: data.current_period_end,
        status: data.status,
      });

      await existingSubscription.save();

      msg.ack();
    } catch (err) {}
  };
}
