import { Message } from "node-nats-streaming";
import { Subjects, Listener, SubscriptionUpdatedEvent } from "@tartine/common";

import { Subscription } from "../../models/subscription";

export class SubscriptionUpdatedListener extends Listener<SubscriptionUpdatedEvent> {
  readonly subject = Subjects.SubscriptionUpdated;

  queueGroupName = "subscriptions-service";

  onMessage = async (data: SubscriptionUpdatedEvent["data"], msg: Message) => {
    try {
      let { stripeSubscription } = data;

      console.log(
        "SubscriptionUpdatedListener",
        JSON.stringify(stripeSubscription, null, 2)
      );

      let existingSubscription = await Subscription.findByEvent(data);

      if (!existingSubscription) {
        throw new Error(
          "SubscriptionUpdatedEvent contains an out-of-order version of an updated subscription"
        );
      }

      existingSubscription.set({
        stripeSubscription,
      });

      await existingSubscription.save();

      msg.ack();
    } catch (err) {}
  };
}
