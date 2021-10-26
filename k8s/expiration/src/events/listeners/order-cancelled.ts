import { Message } from "node-nats-streaming";
import { Listener, OrderCancelledEvent, Subjects } from "@tartine/common";

export class OrderCancelledListener extends Listener<OrderCancelledEvent> {
  readonly subject = Subjects.OrderCancelled;

  queueGroupName = "expiration-service";

  onMessage = async (data: OrderCancelledEvent["data"], msg: Message) => {
    try {
      /**
       * Cancel the Bull job
       */

      msg.ack();
    } catch (err) {}
  };
}
