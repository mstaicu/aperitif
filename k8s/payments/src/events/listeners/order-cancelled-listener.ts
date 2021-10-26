import { Message } from "node-nats-streaming";

import { Listener, OrderCancelledEvent, Subjects } from "@tartine/common";

import { Order, OrderStatus } from "../../models/order";

export class OrderCancelledListener extends Listener<OrderCancelledEvent> {
  readonly subject = Subjects.OrderCancelled;

  queueGroupName = "payments-service";

  onMessage = async (data: OrderCancelledEvent["data"], msg: Message) => {
    try {
      const order = await Order.findByEvent(data);

      if (!order) {
        throw new Error("Order not found");
      }

      order.set({
        status: OrderStatus.Cancelled,
      });

      await order.save();

      msg.ack();
    } catch (err) {
      /**
       * TODO: Handle out of order messages
       */
    }
  };
}
