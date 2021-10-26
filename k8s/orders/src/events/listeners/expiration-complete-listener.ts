import { Message } from "node-nats-streaming";
import { Listener, Subjects, ExpirationCompleteEvent } from "@tartine/common";

import { Order, OrderStatus } from "../../models/order";

import { OrderCancelledPublisher } from "../publishers";

export class ExpirationCompleteListener extends Listener<ExpirationCompleteEvent> {
  readonly subject = Subjects.ExpirationComplete;

  queueGroupName = "orders-service";

  onMessage = async (data: ExpirationCompleteEvent["data"], msg: Message) => {
    try {
      const order = await Order.findById(data.orderId).populate("ticket");

      if (!order) {
        throw new Error("Order not found");
      }

      if (order.status === OrderStatus.Complete) {
        return msg.ack();
      }

      order.set({
        status: OrderStatus.Cancelled,
      });

      await order.save();

      await new OrderCancelledPublisher(this.client).publish({
        id: order.id,
        version: order.version,
        ticket: {
          id: order.ticket.id,
        },
      });

      msg.ack();
    } catch (err) {}
  };
}
