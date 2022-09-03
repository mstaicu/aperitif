import { Message } from "node-nats-streaming";
import { Listener, OrderCreatedEvent, Subjects } from "@tartine/common";

import { expirationQueue } from "../../queues";

export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
  readonly subject = Subjects.OrderCreated;

  queueGroupName = "expiration-service";

  onMessage = async (data: OrderCreatedEvent["data"], msg: Message) => {
    try {
      const delay = new Date(data.expiresAt).getTime() - new Date().getTime();

      await expirationQueue.add(
        {
          orderId: data.id,
        },
        {
          delay,
        }
      );

      msg.ack();
    } catch (err) {}
  };
}
