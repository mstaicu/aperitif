import { Message } from "node-nats-streaming";

import { Listener, Subjects, PaymentCreatedEvent } from "@tartine/common";

import { Order, OrderStatus } from "../../models/order";

export class PaymentCreatedListener extends Listener<PaymentCreatedEvent> {
  readonly subject = Subjects.PaymentCreated;

  queueGroupName = "orders-service";

  onMessage = async (data: PaymentCreatedEvent["data"], msg: Message) => {
    try {
      const { orderId } = data;

      const order = await Order.findById(orderId);

      if (!order) {
        throw new Error("Order not found");
      }

      order.set({
        status: OrderStatus.Complete,
      });

      await order.save();

      msg.ack();
    } catch (err) {
      /**
       * TODO: Handle out of order related errors
       */
    }
  };
}
