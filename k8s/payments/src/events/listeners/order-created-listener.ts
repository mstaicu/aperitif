import { Message } from "node-nats-streaming";

import { Listener, OrderCreatedEvent, Subjects } from "@tartine/common";

import { Order } from "../../models/order";

export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
  readonly subject = Subjects.OrderCreated;

  queueGroupName = "payments-service";

  onMessage = async (data: OrderCreatedEvent["data"], msg: Message) => {
    try {
      const order = Order.build({
        id: data.id,
        status: data.status,
        userId: data.userId,
        price: data.ticket.price,
        version: data.version,
      });

      await order.save();

      msg.ack();
    } catch (err) {}
  };
}
